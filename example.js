"use strict";

const Web3Modal = window.Web3Modal.default;
const WalletConnectProvider = window.WalletConnectProvider.default;

let web3Modal;
let provider;
let selectedAccount;

const USDT_CONTRACTS = {
  1: "0xdac17f958d2ee523a2206206994597c13d831ec7", // Ethereum
  56: "0x55d398326f99059ff775485246999027b3197955", // BSC
  137: "0x9C9e5fD8bbc25984B178FdCE6117Defa39d2db39", // Polygon
  42161: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9" // Arbitrum
};

const RPC_URLS = {
  1: "https://ethereum.publicnode.com", // Public Ethereum RPC
  56: "https://bsc-dataseed.binance.org/",
  137: "https://polygon-rpc.com/",
  42161: "https://arb1.arbitrum.io/rpc"
};

const CHAIN_NAMES = {
  1: "Ethereum Mainnet",
  56: "Binance Smart Chain",
  137: "Polygon",
  42161: "Arbitrum"
};

async function fetchUSDTBalance(address, chainId) {
  if (!RPC_URLS[chainId] || !USDT_CONTRACTS[chainId]) {
    return { chainName: "Unknown", balance: 0 };
  }
  try {
    const web3 = new Web3(new Web3.providers.HttpProvider(RPC_URLS[chainId]));
    //const usdtAbi = [{
    //  "constant": true,
    //  "inputs": [{ "name": "_owner", "type": "address" }],
    //  "name": "balanceOf",
    //  "outputs": [{ "name": "balance", "type": "uint256" }],
    //  "type": "function"
    //}];
    const usdtAbi = [
     {
       "constant": true,
       "inputs": [{ "name": "_owner", "type": "address" }],
       "name": "balanceOf",
       "outputs": [{ "name": "balance", "type": "uint256" }],
       "type": "function"
     },
     {
       "constant": true,
       "inputs": [],
       "name": "decimals",
       "outputs": [{ "name": "", "type": "uint8" }],
       "type": "function"
     }
    ];
    
    const usdtContract = new web3.eth.Contract(usdtAbi, USDT_CONTRACTS[chainId]);
    const balance = await usdtContract.methods.balanceOf(address).call();
 //   return { chainName: CHAIN_NAMES[chainId] || "Unknown", balance: balance / (10 ** 6) };
        // Fetch decimals safely
    let decimals = 6; // Default for USDT
    try {
      decimals = await usdtContract.methods.decimals().call();
    } catch (error) {
      console.warn(`Could not fetch decimals for chain ${chainId}, using default (6)`);
    }
    return { chainName: CHAIN_NAMES[chainId] || "Unknown", balance: balance / (10 ** decimals) };
  } catch (error) {
    console.error(`Error fetching USDT balance for chain ${chainId}:`, error);
    return { chainName: CHAIN_NAMES[chainId] || "Unknown", balance: 0 };
  }
}

async function fetchAccountData() {
  const web3 = new Web3(provider);
  const chainId = await web3.eth.getChainId();
  document.querySelector("#network-name").textContent = CHAIN_NAMES[chainId] || "Unknown";

  const accounts = await web3.eth.getAccounts();
  selectedAccount = accounts[0];
  document.querySelector("#selected-account").textContent = selectedAccount;

  //let usdtBalances = "";
  //for (const networkId of Object.keys(USDT_CONTRACTS)) {
  //  const { chainName, balance } = await fetchUSDTBalance(selectedAccount, Number(networkId));
  //  usdtBalances += `<tr><td>${chainName}</td><td>${balance.toFixed(2)} USDT</td></tr>`;
  //}

  let usdtBalances = "";
  for (const networkId of Object.keys(USDT_CONTRACTS)) {
    const { chainName, balance } = await fetchUSDTBalance(selectedAccount, Number(networkId));
    const formattedBalance = balance.toFixed(8); // 8 decimal places
    const usdEquivalent = (balance * 0.999).toFixed(2); // Approximate USD price

    usdtBalances += `
      <tr>
        <td>${chainName}</td>
        <td>
          <div style="font-size: 18px; font-weight: bold;">${formattedBalance} <span style="font-size: 16px;">USDT</span></div>
          <div style="font-size: 14px; color: gray;">$${usdEquivalent}</div>
        </td>
      </tr>`;
  }

  document.querySelector("#accounts").innerHTML = usdtBalances;
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
    web3Modal = new Web3Modal({
      cacheProvider: false,
      providerOptions: {
        walletconnect: {
          package: WalletConnectProvider,
          options: {
            infuraId: "8043bb2cf99347b1bfadfb233c5325c0",
          }
        }
      },
      disableInjectedProvider: false,
    });
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
  if (provider && provider.close) {
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
}

window.addEventListener('load', async () => {
  init();
  document.querySelector("#btn-connect").addEventListener("click", onConnect);
  document.querySelector("#btn-disconnect").addEventListener("click", onDisconnect);
});
