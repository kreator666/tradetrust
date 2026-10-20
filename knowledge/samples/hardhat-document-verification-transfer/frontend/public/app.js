const els = {
  rpc: document.getElementById('rpc'),
  registry: document.getElementById('registry'),
  escrow: document.getElementById('escrow'),
  docHash: document.getElementById('docHash'),
  connect: document.getElementById('connect'),
  load: document.getElementById('load'),
  result: document.getElementById('result'),
};

let provider = null;
let signer = null;
let registryAbi = null;
let escrowAbi = null;

async function init() {
  try {
    const config = await fetch('/config').then((r) => r.json());
    if (config.registry) els.registry.value = config.registry;
    if (config.escrow) els.escrow.value = config.escrow;
    if (config.documentHash) els.docHash.value = config.documentHash;
    if (config.network && !els.rpc.value) {
      els.rpc.placeholder = config.network === 'sepolia' ? 'https://rpc.sepolia.org' : '输入 RPC URL';
    }

    [registryAbi, escrowAbi] = await Promise.all([
      fetch('/abis/DocumentRegistry').then((r) => r.json()),
      fetch('/abis/DocumentEscrow').then((r) => r.json()),
    ]);
  } catch (e) {
    console.error('初始化失败', e);
  }
}

els.connect.addEventListener('click', async () => {
  if (!window.ethereum) {
    alert('请安装 MetaMask');
    return;
  }
  await window.ethereum.request({ method: 'eth_requestAccounts' });
  provider = new ethers.BrowserProvider(window.ethereum);
  signer = await provider.getSigner();
  const network = await provider.getNetwork();
  els.result.textContent = `已连接钱包：${await signer.getAddress()}，网络 chainId=${network.chainId}`;
  els.result.className = 'status';
});

els.load.addEventListener('click', async () => {
  const registryAddress = els.registry.value.trim();
  const escrowAddress = els.escrow.value.trim();
  const docHash = els.docHash.value.trim();

  if (!registryAddress || !escrowAddress || !docHash) {
    alert('请填写 Registry、Escrow 地址与文档哈希');
    return;
  }

  if (!provider) {
    const rpc = els.rpc.value.trim();
    if (!rpc) {
      alert('请连接 MetaMask 或输入 RPC URL');
      return;
    }
    provider = new ethers.JsonRpcProvider(rpc);
  }

  try {
    const registry = new ethers.Contract(registryAddress, registryAbi, provider);
    const escrow = new ethers.Contract(escrowAddress, escrowAbi, provider);

    const [status, issuedAt, revokedAt, issuer] = await registry.verify(docHash);
    const isValid = await registry.isValid(docHash);
    const beneficiary = await escrow.beneficiary();
    const holder = await escrow.holder();
    const surrendered = await escrow.surrendered();
    const escrowDocHash = await escrow.documentHash();

    const statusMap = { 0: 'None（未记录）', 1: 'Issued（已签发）', 2: 'Revoked（已撤销）' };
    const lines = [
      `DocumentRegistry 状态：${statusMap[Number(status)] || status}`,
      `是否有效：${isValid ? '是' : '否'}`,
      `签发时间：${issuedAt ? new Date(Number(issuedAt) * 1000).toLocaleString() : '-'}`,
      `撤销时间：${revokedAt ? new Date(Number(revokedAt) * 1000).toLocaleString() : '-'}`,
      `签发者：${issuer}`,
      ``,
      `DocumentEscrow 信息：`,
      `受益人 (beneficiary)：${beneficiary}`,
      `持有人 (holder)：${holder}`,
      `是否已归还：${surrendered ? '是' : '否'}`,
      `Escrow 文档哈希：${escrowDocHash}`,
    ];

    els.result.innerHTML = `<pre>${lines.join('\n')}</pre>`;
    els.result.className = `status ${isValid ? 'valid' : 'invalid'}`;
  } catch (e) {
    console.error(e);
    els.result.textContent = `查询失败：${e.message || e}`;
    els.result.className = 'status invalid';
  }
});

init();
