console.log('[index.js] loading');

const walletStatus = document.getElementById('walletStatus');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const info = document.getElementById('info');

function renderWalletUI() {
  if (WALLET.connected) {
    walletStatus.innerHTML = `<span class="success">已连接 ${short(WALLET.address)} (chainId=${WALLET.chainId})</span>`;
    connectBtn.style.display = 'none';
    disconnectBtn.style.display = 'inline-block';
  } else {
    walletStatus.textContent = '未连接钱包';
    connectBtn.style.display = 'inline-block';
    disconnectBtn.style.display = 'none';
  }
}

onWalletUIUpdate(renderWalletUI);

connectBtn.addEventListener('click', async () => {
  connectBtn.disabled = true;
  connectBtn.textContent = '连接中...';
  try {
    const { address } = await connectWallet();
    alert(`钱包连接并签名验证成功：${address}`);
  } catch (e) {
    alert(`连接失败：${e.message}`);
  } finally {
    connectBtn.disabled = false;
    connectBtn.textContent = '连接钱包';
    renderWalletUI();
  }
});

disconnectBtn.addEventListener('click', () => {
  disconnectWallet();
  renderWalletUI();
});

function renderInfo() {
  renderWalletUI();
  if (!info) return;
  window.configReady
    .then(() => {
      if (CONFIG.registry) {
        info.innerHTML = `
          <div><strong>Network:</strong> ${CONFIG.network}</div>
          <div><strong>DocumentRegistry:</strong> <code>${CONFIG.registry}</code></div>
          <div><strong>DocumentEscrow:</strong> <code>${CONFIG.escrow}</code></div>
          <div><strong>Demo documentHash:</strong> <code>${CONFIG.documentHash}</code></div>
        `;
      } else {
        info.textContent = '未找到 deployment.json，请先执行 npm run deploy:sepolia。';
      }
    })
    .catch((e) => {
      info.textContent = '配置加载失败：' + e.message;
      console.error(e);
    });
}

renderInfo();
document.addEventListener('DOMContentLoaded', renderInfo);
