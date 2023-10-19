# Trustless Blockchain Data Verifier

> **Warning**  
> This extension is in a beta stage and should be used at your own risk.

This extension uses the [Lodestar](https://github.com/ChainSafe/lodestar) light client implementation to verify blockchain information from centralized sources.

Currently only Ethereum balance verification is supported.

![MetaMask Portfolio](images/MetamaskPortfolio.png?raw=true)
![Etherscan](images/Etherscan.png?raw=true)

# Background & Information

[Don’t trust, verify: An introduction to light clients](https://a16zcrypto.com/posts/article/an-introduction-to-light-clients) by a16zcrypto (Helios)

[The Road Ahead for Ethereum Light Clients](https://blog.chainsafe.io/the-road-ahead-for-ethereum-light-clients-b6fdb7c3b603) by ChainSafe (Lodestar)

[List of sync checkpoint providers](https://eth-clients.github.io/checkpoint-sync-endpoints/)

# Development

## Requirements

Node version 17 or above

## Install

```
npm install
```

## Build

```
npm run build
```

## Test

```
npm run test
```

## Load Chrome Extension

1. Open Google Chrome and go to the three-dot menu on the top right corner of the browser.
2. Go to "More tools" > "Extensions."
3. Enable "Developer mode" by toggling the switch on the top right corner of the page.
4. Click on "Load unpacked" button, select the folder containing your unpacked extension, and click on "Select Folder."
5. Select `dist` folder

# Roadmap

### Balance Verification

| Website   | Page                                                                                              | Status |
| --------- | ------------------------------------------------------------------------------------------------- | ------ |
| Etherscan | [Token Holdings](https://etherscan.io/tokenholdings?a=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045) | ✅     |
|           | [Address](https://etherscan.io/address/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045)                | ✅     |
| MetaMask  | [MetaMask Portfolio](https://portfolio.metamask.io)                                               | ✅     |

### NFT Ownership Verification

⌛ TODO

### Transaction Verification

⌛ TODO
