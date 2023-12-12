# Trustless Blockchain Data Verifier

> **Warning**  
> This extension is in a beta stage and should be used at your own risk.

This extension uses the [Lodestar](https://github.com/ChainSafe/lodestar) light client implementation to verify blockchain information from centralized sources.

The extension is available in the [chrome web store](https://chrome.google.com/webstore/detail/trustless-blockchain-data/lamobknkahhlgennggjjphcdfndjkafj).

![MetaMask Portfolio](images/MetamaskPortfolio.png?raw=true)
![Etherscan](images/Etherscan.png?raw=true)

## Usage
Visit one of the supported websites, a verificaiton status indication should be added next to native ETH and token balances.

### Configuration
Configuration is managed by clicking the extension icon.

- **Beacon API URL**: [Beacon API](https://ethereum.github.io/beacon-APIs/#/Beacon) endpoint url. Default https://lodestar-mainnet.chainsafe.io
- **Ethereum RPC URL**: Regular Ethereum node endpoint url. Default https://lodestar-mainnetrpc.chainsafe.io, can be changed to any node url.
- **Initial Checkpoint**: Initial checkpoint to start syncing from. Can be chosen from a trusted checkpoint provider, for example from [this list](https://eth-clients.github.io/checkpoint-sync-endpoints/)

## Background & Information

[Don’t trust, verify: An introduction to light clients](https://a16zcrypto.com/posts/article/an-introduction-to-light-clients) by a16zcrypto (Helios)

[The Road Ahead for Ethereum Light Clients](https://blog.chainsafe.io/the-road-ahead-for-ethereum-light-clients-b6fdb7c3b603) by ChainSafe (Lodestar)

[List of sync checkpoint providers](https://eth-clients.github.io/checkpoint-sync-endpoints/)

## Development

### Requirements

Node version 17 or above

### Install

```
npm install
```

### Build

```
npm run build
```

### Test

```
npm run test
```

### Load Chrome Extension

1. Open Google Chrome and go to the three-dot menu on the top right corner of the browser.
2. Go to "More tools" > "Extensions."
3. Enable "Developer mode" by toggling the switch on the top right corner of the page.
4. Click on "Load unpacked" button, select the folder containing your unpacked extension, and click on "Select Folder."
5. Select `dist` folder

## Contributing

Contributions of code and ideas are welcome. Prior to opening a pull request, please carefully review our [contribution guidelines](CONTRIBUTING.md).

## License

The code in this repository is offered under the terms of the MIT License, as described in the [LICENSE](LICENSE) file.

## Roadmap

| Website   | Page                                                                                              | Status |
| --------- | ------------------------------------------------------------------------------------------------- | ------ |
| Etherscan | [Token Holdings](https://etherscan.io/tokenholdings?a=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045) | ✅     |
|           | [Address](https://etherscan.io/address/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045)                | ✅     |
| MetaMask  | [MetaMask Portfolio](https://portfolio.metamask.io)                                               | ✅     |
| Chainlink  | [Chainlink Pricefeeds](https://data.chain.link)                                                  | ✅     |

### NFT Ownership Verification

⌛ TODO

### Transaction Verification

⌛ TODO
