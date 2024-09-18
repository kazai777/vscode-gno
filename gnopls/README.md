# `gnopls`, the Gno language server

![Build & Test](https://github.com/gnolang/gnopls/actions/workflows/go.yml/badge.svg)

`gnopls` (pronounced "Gno please") is the Gno [language server]. It provides IDE features to any [LSP]-compatible editor.

## Installation

If you do want to get the latest stable version of `gnopls`, run the following
command:

- Using `go install`
    ```sh
    go install github.com/gnolang/gnopls@latest
    ```

- From source code
    ```sh
    git clone https://github.com/gnolang/gnopls.git
    cd gnopls
    make install
    ```

If you are having issues with `gnopls`, please feel free to open an issue.

## Additional information

Special thanks to [Joseph Kato](https://github.com/jdkato)

As some part of code is copied and modified from [gnols](https://github.com/gno-playground/gnols).

[language server]: https://langserver.org
[LSP]: https://microsoft.github.io/language-server-protocol/
