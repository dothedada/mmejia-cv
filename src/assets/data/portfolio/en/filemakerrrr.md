---
date: 2024-11-10
title: Filemakerrrr
summary: Filemakerrrr is a JavaScript library for zipping and unzipping text strings in the browser using Huffman encoding. Asynchronous, efficient, non-blocking and with support for Unicode BMP. Easy to use, without dependencies, fully typed and available in NPM.
aditionalData: Tool creation
stack:
    - TypeScript
    - Vitest
    - NPM Tooling
preview: /assets/img/portadas/f4r.gif
url: https://dothedada.github.io/filemakerrrr/
repository: https://github.com/dothedada/filemakerrrr
---

## Filemakerrrr

It is a JavaScript library that I designed to facilitate the zipping and unzipping of text strings and files directly from the browser. Focusing on efficiency, it uses Huffman encoding to achieve effective compression without blocking the runtime. The interface is simple and optimized for fast use.

One of its features is the ability to perform asynchronous operations, which ensures that page performance is not affected during the processes of zipping or unzipping. In addition, it offers support for Unicode BMP (Basic Multilingual Plane), allowing it to work with a wide variety of characters and languages.

The zipping process is not always required, and to avoid high resource consumption, Filemakerrrr evaluates the string before attempting to compress it. The system predicts compression rates and only performs the operation if the benefits are clear, ensuring an efficient use of resources.

The project design is fully typed, which provides greater security and ease of integration with other projects. In addition, it has no external dependencies, which makes it a light and easy to implement solution from NPM.

Filemakerrrr is part of a larger project I'm working on to make it easier to publish books and reports and read long texts on screen. The project is alive and I'm currently finishing on a text tokenizer, which I tested by building and producing this site :).
