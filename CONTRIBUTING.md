# Contributing Guidelines

We thank you for taking the time and considering contributing to our project! This document details how to do so.

## Code of Conduct

Please be respectful in all your communications, in pull requests and issues, to all fellow members of the community.

## Add Support for a New Website

1. Add the website url to the [manifest file](./public/manifest.json) under content_scripts/matches
2. Create a directory for the website in the [sites](./src/pages/content/sites/) directory
3. Add page handlers to the previously created directory, to handle various pages in the website (Eee example [Etherscan](./src/pages/content/sites/etherscan/))
4. Initialize the page handler in [src/pages/content/index.ts](./src/pages/content/index.ts)
5. Add tests for the new website in [test/sites](./test/sites/) directory

## How to Contribute

1. **Fork the repository**: This creates a copy of the repository in your account.
2. **Clone the repository**: This downloads the repository to your local machine.
3. **Create a branch**: This isolates your changes into a separate branch.
4. **Make your changes**: Add, edit, or delete files as necessary.
5. **Run tests**: Run the tests with

```
npm run test
```

6. **Commit your changes**: Make a commit to save your changes and write a brief summary of what you did.
7. **Push your changes**: Send your changes to your repository on GitHub.
8. **Create a pull request**: Request that we review your changes and pull them into our repository.

### Commit Sign-Off

We require that all commits would be signed to certify that the contributor has the rights to their contribution and agrees to the terms of our license, as stated below.

To sign your commit, use `git commit -s -m "your commit message"`.

## Licensing

By contributing, you agree that your contributions will be licensed under the license of the project defined at [LICENSE](LICENSE).

Additionally, by providing your contribution, you agree that Fireblocks Ltd. ("Fireblocks") has the right to use and exploit your contribution as they see fit, without any restrictions or additional consent. This does not grant Fireblocks exclusive rights to your contributions but allows Fireblocks to use your contributions in any way, whether publicly or privately, without any liabilities or restrictions.

## Questions?

If you have questions or need additional guidance please open a GitHub issue.

Thank you.
