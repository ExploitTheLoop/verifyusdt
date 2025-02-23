"use strict";

const Web3Modal = window.Web3Modal.default;
const WalletConnectProvider = window.WalletConnectProvider.default;
const evmChains = window.evmChains;

let web3Modal;
let provider;
let selectedAccount;

const USDT_CONTRACTS = {
  1: "0xdac17f958d2ee523a2206206994597c13d831ec7", // Ethereum
  56: "0x55d398326f99059ff775485246999027b3197955", // BSC
  137: "0x9C9e5fD8bbc25984B178FdCE6117Defa39d2db39", // Polygon
  42161: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9" // Arbitrum
};

async function fetchAccountData() {
  const web3 = new Web3(provider);
  const chainId = await web3.eth.getChainId();
  const chainData = evmChains.getChain(chainId);
  document.querySelector("#network-name").textContent = chainData.name || "Unknown";

  const accounts = await web3.eth.getAccounts();
  selectedAccount = accounts[0];
  document.querySelector("#selected-account").textContent = selectedAccount;

  if (!USDT_CONTRACTS[chainId]) {
    alert("USDT not supported on this network.");
    return;
  }

  const usdtAbi = [{
    "constant": true,
    "inputs": [{ "name": "_owner", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "balance", "type": "uint256" }],
    "type": "function"
  }];

  const usdtContract = new web3.eth.Contract(usdtAbi, USDT_CONTRACTS[chainId]);
  const balance = await usdtContract.methods.balanceOf(selectedAccount).call();
  const usdtBalance = balance / (10 ** 6);

  document.querySelector("#accounts").innerHTML = `
    <tr>
      <td>${selectedAccount}</td>
      <td>${usdtBalance.toFixed(2)} USDT</td>
    </tr>
  `;

  document.querySelector("#prepare").style.display = "none";
  document.querySelector("#connected").style.display = "block";
}

async function refreshAccountData() {
  document.querySelector("#connected").style.display = "none";
  document.querySelector("#prepare").style.display = "block";
  document.querySelector("#btn-connect").setAttribute("disabled", "disabled");
  await fetchAccountData();
  document.querySelector("#btn-connect").removeAttribute("disabled");
}

async function onConnect() {
  try {
    provider = await web3Modal.connect();
  } catch(e) {
    console.log("Wallet connection failed", e);
    return;
  }

  provider.on("accountsChanged", fetchAccountData);
  provider.on("chainChanged", fetchAccountData);
  provider.on("networkChanged", fetchAccountData);

  await refreshAccountData();
}

async function onDisconnect() {
  if (provider.close) {
    await provider.close();
    await web3Modal.clearCachedProvider();
    provider = null;
  }
  selectedAccount = null;
  document.querySelector("#prepare").style.display = "block";
  document.querySelector("#connected").style.display = "none";
}

function init() {
  console.log("Initializing...");
  if (location.protocol !== 'https:') {
    document.querySelector("#alert-error-https").style.display = "block";
    document.querySelector("#btn-connect").setAttribute("disabled", "disabled");
    return;
  }

  const providerOptions = {
    walletconnect: {
      package: WalletConnectProvider,
      options: {
        infuraId: "8043bb2cf99347b1bfadfb233c5325c0",
      }
    }
  };

  web3Modal = new Web3Modal({
    cacheProvider: false,
    providerOptions,
    disableInjectedProvider: false,
  });
}

window.addEventListener('load', async () => {
  init();
  document.querySelector("#btn-connect").addEventListener("click", onConnect);
  document.querySelector("#btn-disconnect").addEventListener("click", onDisconnect);
});
