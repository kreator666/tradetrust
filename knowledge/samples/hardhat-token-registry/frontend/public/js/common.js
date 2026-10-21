console.log('[common.js] loading');

const CONFIG = {
  network: 'sepolia',
  tokenRegistry: '',
  titleEscrowFactory: '',
  deployer: '',
  mint: null,
};

let TOKEN_REGISTRY_ABI = [];
let TITLE_ESCROW_ABI = [];

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
  } catch (e) {}
}

function safeLocalStorageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {}
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} 超时`)), ms)),
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

    [TOKEN_REGISTRY_ABI, TITLE_ESCROW_ABI] = await Promise.all([
      fetch('/abis/TradeTrustToken').then((r) => r.json()),
      fetch('/abis/TitleEscrow').then((r) => r.json()),
    ]);

    await tryRestoreWallet();
  } catch (e) {
    console.error('初始化失败', e);
    throw e;
  }
}

async function tryRestoreWallet() {
  await loadCachedWallet().catch(() => {});

  if (typeof window !== 'undefined' && !hasMetaMask()) {
    window.addEventListener(
      'ethereum#initialized',
      async () => {
        await loadCachedWallet().catch(() => {});
      },
      { once: true }
    );
  }

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

function getTokenRegistryContract(providerOrSigner, address) {
  return new ethers.Contract(address || CONFIG.tokenRegistry, TOKEN_REGISTRY_ABI, providerOrSigner);
}

function getTitleEscrowContract(providerOrSigner, address) {
  return new ethers.Contract(address, TITLE_ESCROW_ABI, providerOrSigner);
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

  const message = `TradeTrust official demo login: ${address}`;
  const signature = await withTimeout(signer.signMessage(message), 60000, '签名');
  const recovered = ethers.verifyMessage(message, signature);
  if (recovered.toLowerCase() !== address.toLowerCase()) {
    throw new Error('签名验证失败');
  }

  WALLET.connected = true;
  WALLET.address = address;
  WALLET.chainId = network.chainId.toString();
  safeLocalStorageSet('ttOfficialWallet', JSON.stringify({ address, chainId: WALLET.chainId }));

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
  safeLocalStorageRemove('ttOfficialWallet');
  safeRemoveListener('accountsChanged', handleAccountsChanged);
  safeRemoveListener('chainChanged', handleChainChanged);
}

async function loadCachedWallet() {
  const cached = safeLocalStorageGet('ttOfficialWallet');
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
      safeLocalStorageRemove('ttOfficialWallet');
    }
  } catch (e) {
    console.error('恢复钱包连接失败', e);
    safeLocalStorageRemove('ttOfficialWallet');
  }
}

function handleAccountsChanged(accounts) {
  if (!accounts || accounts.length === 0) {
    disconnectWallet();
  } else if (WALLET.address && accounts[0].toLowerCase() !== WALLET.address.toLowerCase()) {
    WALLET.address = accounts[0];
    safeLocalStorageSet('ttOfficialWallet', JSON.stringify({ address: accounts[0], chainId: WALLET.chainId }));
  }
  updateWalletUI && updateWalletUI();
}

function handleChainChanged(chainId) {
  WALLET.chainId = parseInt(chainId, 16).toString();
  safeLocalStorageSet('ttOfficialWallet', JSON.stringify({ address: WALLET.address, chainId: WALLET.chainId }));
  updateWalletUI && updateWalletUI();
}

let updateWalletUI = null;
function onWalletUIUpdate(fn) {
  updateWalletUI = fn;
}

window.configReady = initCommon();
