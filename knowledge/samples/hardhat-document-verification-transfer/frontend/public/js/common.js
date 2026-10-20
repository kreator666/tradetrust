console.log('[common.js] loading');

const CONFIG = {
  registry: '',
  escrow: '',
  documentHash: '',
  network: 'sepolia',
};

let REGISTRY_ABI = [];
let ESCROW_ABI = [];

const WALLET = {
  connected: false,
  address: '',
  chainId: '',
};

const SEPOLIA_CHAIN_ID = '11155111';

function hasMetaMask() {
  try {
    return typeof window !== 'undefined' && !!window.ethereum;
  } catch (e) {
    return false;
  }
}

function safeLocalStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

function safeLocalStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    // 在禁用 localStorage 的环境（如部分隐私模式）静默失败
  }
}

function safeLocalStorageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    // ignore
  }
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} 超时，请确认 MetaMask 已安装并解锁`)), ms)),
  ]);
}

function getEthereum() {
  return hasMetaMask() ? window.ethereum : null;
}

function safeAddListener(event, handler) {
  const eth = getEthereum();
  if (!eth) return;
  try {
    if (typeof eth.addEventListener === 'function') {
      eth.addEventListener(event, handler);
    } else if (typeof eth.on === 'function') {
      eth.on(event, handler);
    }
  } catch (e) {
    console.warn('添加钱包事件监听失败', e);
  }
}

function safeRemoveListener(event, handler) {
  const eth = getEthereum();
  if (!eth) return;
  try {
    if (typeof eth.removeEventListener === 'function') {
      eth.removeEventListener(event, handler);
    } else if (typeof eth.removeListener === 'function') {
      eth.removeListener(event, handler);
    }
  } catch (e) {
    console.warn('移除钱包事件监听失败', e);
  }
}

async function initCommon() {
  try {
    const config = await fetch('/config').then((r) => r.json());
    Object.assign(CONFIG, config);

    [REGISTRY_ABI, ESCROW_ABI] = await Promise.all([
      fetch('/abis/DocumentRegistry').then((r) => r.json()),
      fetch('/abis/DocumentEscrow').then((r) => r.json()),
    ]);

    // 尝试恢复钱包缓存；若 MetaMask 尚未注入，延迟再试并监听 ethereum#initialized
    await tryRestoreWallet();
  } catch (e) {
    console.error('初始化失败', e);
    throw e;
  }
}

async function tryRestoreWallet() {
  await loadCachedWallet().catch(() => {});

  // MetaMask 可能异步注入 window.ethereum，监听其初始化事件
  if (typeof window !== 'undefined' && !hasMetaMask()) {
    window.addEventListener(
      'ethereum#initialized',
      async () => {
        await loadCachedWallet().catch(() => {});
      },
      { once: true }
    );
  }

  // 兜底：延迟再试一次
  setTimeout(async () => {
    if (!WALLET.connected) {
      await loadCachedWallet().catch(() => {});
    }
  }, 800);
}

async function hashFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  return ethers.keccak256(bytes);
}

function getReadProvider(rpcUrl) {
  // 只读查询默认使用公共 RPC，不依赖 MetaMask 当前网络，避免连错网络导致解码失败。
  return new ethers.JsonRpcProvider(rpcUrl || 'https://ethereum-sepolia-rpc.publicnode.com');
}

async function getBrowserProvider() {
  if (!hasMetaMask()) throw new Error('请安装 MetaMask');
  return new ethers.BrowserProvider(window.ethereum);
}

async function getSigner() {
  const provider = await getBrowserProvider();
  await provider.send('eth_requestAccounts', []);
  return provider.getSigner();
}

async function getConnectedSigner() {
  if (!WALLET.connected) throw new Error('请先连接钱包');
  return getSigner();
}

function getRegistryContract(providerOrSigner, address) {
  return new ethers.Contract(address || CONFIG.registry, REGISTRY_ABI, providerOrSigner);
}

function getEscrowContract(providerOrSigner, address) {
  return new ethers.Contract(address || CONFIG.escrow, ESCROW_ABI, providerOrSigner);
}

function short(addr) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '-';
}

async function switchToSepolia() {
  if (!hasMetaMask()) return;
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0xaa36a7' }],
    });
  } catch (switchError) {
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: '0xaa36a7',
            chainName: 'Sepolia',
            nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
            blockExplorerUrls: ['https://sepolia.etherscan.io'],
          },
        ],
      });
    }
  }
}

async function connectWallet() {
  if (!hasMetaMask()) throw new Error('请安装 MetaMask');

  await withTimeout(switchToSepolia(), 15000, '切换网络');
  const provider = await getBrowserProvider();
  await withTimeout(provider.send('eth_requestAccounts', []), 60000, '请求账户');
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const network = await provider.getNetwork();

  // 签名验证：证明该地址可控
  const message = `TradeTrust demo login: ${address}`;
  const signature = await withTimeout(signer.signMessage(message), 60000, '签名');
  const recovered = ethers.verifyMessage(message, signature);
  if (recovered.toLowerCase() !== address.toLowerCase()) {
    throw new Error('签名验证失败');
  }

  WALLET.connected = true;
  WALLET.address = address;
  WALLET.chainId = network.chainId.toString();
  safeLocalStorageSet('ttWallet', JSON.stringify({ address, chainId: WALLET.chainId }));

  // 监听账户/网络变化（兼容 addEventListener / on 两种 EIP-1193 实现）
  safeRemoveListener('accountsChanged', handleAccountsChanged);
  safeRemoveListener('chainChanged', handleChainChanged);
  safeAddListener('accountsChanged', handleAccountsChanged);
  safeAddListener('chainChanged', handleChainChanged);

  return { address, chainId: WALLET.chainId, signature };
}

function disconnectWallet() {
  WALLET.connected = false;
  WALLET.address = '';
  WALLET.chainId = '';
  safeLocalStorageRemove('ttWallet');
  safeRemoveListener('accountsChanged', handleAccountsChanged);
  safeRemoveListener('chainChanged', handleChainChanged);
}

async function loadCachedWallet() {
  const cached = safeLocalStorageGet('ttWallet');
  if (!cached || !hasMetaMask()) return;
  try {
    const { address, chainId } = JSON.parse(cached);
    const provider = await getBrowserProvider();
    const accounts = await provider.send('eth_accounts', []);
    if (accounts.map((a) => a.toLowerCase()).includes(address.toLowerCase())) {
      WALLET.connected = true;
      WALLET.address = address;
      WALLET.chainId = chainId;
      safeRemoveListener('accountsChanged', handleAccountsChanged);
      safeRemoveListener('chainChanged', handleChainChanged);
      safeAddListener('accountsChanged', handleAccountsChanged);
      safeAddListener('chainChanged', handleChainChanged);
      if (updateWalletUI) updateWalletUI();
    } else {
      safeLocalStorageRemove('ttWallet');
    }
  } catch (e) {
    console.error('恢复钱包连接失败', e);
    safeLocalStorageRemove('ttWallet');
  }
}

function handleAccountsChanged(accounts) {
  if (!accounts || accounts.length === 0) {
    disconnectWallet();
  } else if (WALLET.address && accounts[0].toLowerCase() !== WALLET.address.toLowerCase()) {
    WALLET.address = accounts[0];
    safeLocalStorageSet('ttWallet', JSON.stringify({ address: accounts[0], chainId: WALLET.chainId }));
  }
  updateWalletUI && updateWalletUI();
}

function handleChainChanged(chainId) {
  WALLET.chainId = parseInt(chainId, 16).toString();
  safeLocalStorageSet('ttWallet', JSON.stringify({ address: WALLET.address, chainId: WALLET.chainId }));
  updateWalletUI && updateWalletUI();
}

// 页面可覆盖此函数以更新钱包状态显示
let updateWalletUI = null;
function onWalletUIUpdate(fn) {
  updateWalletUI = fn;
}

window.configReady = initCommon();
