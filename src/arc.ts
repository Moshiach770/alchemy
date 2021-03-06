import { Address, Arc } from "@daostack/client";
import { waitUntilTrue} from "lib/util";
import { NotificationStatus } from "reducers/notifications";
import { Observable } from "rxjs";
import { getNetworkName } from "./lib/util";

const settings = {
  dev: {
    graphqlHttpProvider: "http://127.0.0.1:8000/subgraphs/name/daostack",
    graphqlWsProvider: "ws://127.0.0.1:8001/subgraphs/name/daostack",
    web3Provider: "ws://127.0.0.1:8545",
    ipfsProvider: "localhost",
  },
  staging: {
    graphqlHttpProvider: "https://rinkeby.subgraph.daostack.io/subgraphs/name/v20",
    graphqlWsProvider: "wss://ws.rinkeby.subgraph.daostack.io/subgraphs/name/v20",
    web3Provider: `wss://rinkeby.infura.io/ws/v3/e0cdf3bfda9b468fa908aa6ab03d5ba2`,
    ipfsProvider: {
      "host": "rinkeby.subgraph.daostack.io",
      "port": "443",
      "protocol": "https",
      "api-path": "/ipfs/api/v0/"
    },
  },
  production: {
    graphqlHttpProvider: "https://subgraph.daostack.io/subgraphs/name/v20",
    graphqlWsProvider: "wss://ws.subgraph.daostack.io/subgraphs/name/v20",
    web3Provider: `wss://mainnet.infura.io/ws/v3/e0cdf3bfda9b468fa908aa6ab03d5ba2`,
    ipfsProvider: {
      "host": "subgraph.daostack.io",
      "port": "443",
      "protocol": "https",
      "api-path": "/ipfs/api/v0/"
    },
  }
};

/**
 * check if the web3 connection is ready to send transactions, and warn the user if it is not
 *
 * @param showNotification the warning will be sent using the showNotification function;
 *    it will use `alert()` if no such function is provided
 * @return the web3 connection, if everything is fine
 */
export async function checkMetaMaskAndWarn(showNotification?: any): Promise<boolean> {
  try {
    const metamask = await checkMetaMask();
    await metamask.enable();
    return metamask;
  } catch (err) {
    const msg =  err.message;
    if (msg.match(/enable metamask/i) && process.env.NODE_ENV === "development") {
      console.log( `No metamask connection found - we are in "development" environment, so this may be ok`);
      return true;
    } else {
      if (showNotification) {
        showNotification(NotificationStatus.Failure, msg);
      } else {
        alert(msg);
      }
    }
  }
}

/**
 * Checks if the web3 Provider is ready to send transactions and configured as expected;
 * throws an Error if something is wrong, returns the web3 connection if that is ok
 * @return
 */
export async function checkMetaMask(metamask?: any) {
  let expectedNetworkName;
  switch (process.env.NODE_ENV) {
    case "development": {
      expectedNetworkName = "ganache";
      break;
    }
    case "staging": {
      expectedNetworkName = "rinkeby";
      break;
    }
    case  "production": {
      expectedNetworkName = "main";
      break;
    }
    default: {
      throw new Error(`Unknown NODE_ENV: ${process.env.NODE_ENV}`);
    }
  }

  let web3Provider: any;
  if (metamask) {
    web3Provider = metamask;
  } else {
    web3Provider = getMetaMask();
  }
  if (!web3Provider) {
    const msg = `Please install or enable metamask`;
    throw Error(msg);
  }

  const networkName = await getNetworkName(web3Provider.networkVersion);
  if (networkName === expectedNetworkName) {
    return web3Provider;
  } else {
    const msg = `Please connect to "${expectedNetworkName}"`;
    throw new Error(msg);
  }
}

/**
 * get the current user from the web3 Provider
 * @return [description]
 */
export async function getCurrentAccountAddress(): Promise<Address> {
  const web3 = getArc().web3;
  const accounts = await web3.eth.getAccounts();
  return accounts[0];
}

/**
 * check if a metamask instanse is available and an account is unlocked
 * @return [description]
 */
export function getMetaMask(): any {
  const ethereum = (<any> window).ethereum;
  return ethereum;
}

export async function enableMetamask(): Promise<any> {
  // check if Metamask account access is enabled, and if not, call the (async) function
  // that will ask the user to enable it
  const ethereum = getMetaMask();
  if (!ethereum) {
    const msg = `Please install or enable metamask`;
    throw Error(msg);
  }
  await ethereum.enable();
  return ethereum;
}

// get appropriate Arc configuration for the given environment
function getArcSettings(): any {
  let arcSettings: any;
  switch (process.env.NODE_ENV || "development") {
    case "development": {
      arcSettings = settings.dev;
      break;
    }
    case "staging" : {
      arcSettings = settings.staging;
      break;
    }
    case "production" : {
      arcSettings = settings.production;
      break;
    }
    default: {
      console.log(process.env.NODE_ENV === "development");
      throw Error(`Unknown NODE_ENV environment: "${process.env.NODE_ENV}"`);
    }
  }
  return arcSettings;
}

export function getArc(): Arc {
  // store the Arc instance in the global namespace on the 'window' object
  // (this is not best practice)
  const arc = (<any> window).arc;
  if (!arc) {
    throw Error("window.arc is not defined - please call initializeArc first");
  }
  return arc;
}

export async function initializeArc(): Promise<Arc> {
  const arcSettings = getArcSettings();
  const metamask = getMetaMask();
  if (metamask) {
    console.log("waiting for MetaMask to initialize");
    //
    try {
      await waitUntilTrue(() => metamask.networkVersion, 1000);
      console.log(`MetaMask is ready, and connected to ${metamask.networkVersion}`);
    } catch (err) {
      if (err.message.match(/timed out/)) {
        console.log("Error: Could not connect to Metamask (time out)");
      }
      console.log(err);
    }
  }

  try {
    arcSettings.web3Provider = await checkMetaMask(metamask);
  } catch (err) {
    // metamask is not correctly configured or available, so we use the default (read-only) web3 provider
    console.log(err);
  }

  // log some useful info
  console.log(`Found NODE_ENV "${process.env.NODE_ENV}", using the following settings for Arc`);
  console.log(arcSettings);
  console.log(`alchemy-server (process.env.API_URL): ${process.env.API_URL}`);
  if (arcSettings.web3Provider.isMetaMask) {
    console.log("Using Metamask Web3 provider");
  } else {
    console.log("Using default Web3 provider");
  }

  const arc: Arc = new Arc(arcSettings);
  await arc.initialize();
  // save the object on a global window object (I know, not nice, but it works..)
  (<any> window).arc = arc;
  return arc;
}

// cf. https://github.com/MetaMask/faq/blob/master/DEVELOPERS.md#ear-listening-for-selected-account-changes
// Polling is Evil!
// TODO: check if this (new?) function can replace polling:
// https://metamask.github.io/metamask-docs/Main_Concepts/Accessing_Accounts
export function pollForAccountChanges(currentAccountAddress?: string, interval: number = 2000) {
  console.log("start polling for account changes");
  return Observable.create((observer: any) => {
    let prevAccount = currentAccountAddress;
    function emitIfNewAccount() {
      getCurrentAccountAddress()
        .then((account) => {
          if (prevAccount !== account) {
            observer.next(account);
            prevAccount = account;
          }
        })
        .catch((err) => { console.warn(err.message); });
    }

    emitIfNewAccount();
    const timeout = setInterval(emitIfNewAccount, interval);
    return () => clearTimeout(timeout);
  });
}
