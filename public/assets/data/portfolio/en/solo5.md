---
date: 2025-03-15
title: Solo5
summary: Solo5 is a command-line tool for organizing and prioritizing tasks locally, without relying on external services. It analyzes dates and urgency levels to automatically adjust priorities. Its flexible tokenization system allows for interpreting dates in natural language, different formats and languages. Designed to be accessible and easily translatable.
aditionalData: Tooling, multilingual.
stack:
    - Python
preview: /assets/img/portadas/solo5.gif
repository: https://github.com/dothedada/solo5
---

## Solo5

![](/assets/img/solo5/home.jpg){Home screen}

Solo5 is a command-line application designed to quickly and efficiently organize and prioritize daily tasks. Unlike other productivity tools, Solo5 focuses on five significant tasks per day, promoting concentration and a healthier time management.

All processing is done locally, without relying on external services for natural language processing, artificial intelligence, or cloud storage. This ensures user privacy and prevents the use of their information while also providing optimal performance without the need of a internet connection.

![](/assets/img/solo5/search.jpg){Task search}

The prioritization system is flexible and adapts to the user's workflow. Based on each task's description, the application analyzes its due date, whether it is non-deferrable, and its level of difficulty. With this information, it determines its urgency and the most appropriate time for its completion. Additionally, the system automatically adjusts priorities as new tasks are added, reassessing them daily to optimize time management without requiring manual intervention.

Since the way we express our tasks varies between languages and even dialects, accessibility was a priority in the design and development. The application facilitates the translation of the interface, commands, and the tokenization system that interprets and prioritizes tasks, allowing for the addition or modification of languages without changing the source code.

![](/assets/img/solo5/confirm.jpg){Actions confirmation}

One of the biggest challenges was maintaining language flexibility while correctly interpreting dates. Solo5 uses regular expressions within a tokenization system capable of capturing dates written in various formats, whether absolute ("March 25") or relative ("next Friday" or "two weeks from this Friday"). This system is flexible enough to adapt to the natural way dates are expressed in different languages.

![](/assets/img/solo5/done.jpg){Day overview}

In the future, support for executing commands in a single line is expected to be implemented, allowing integration with application launchers such as Albert, Rofi, and Ulauncher. This would make its use even more accessible, enabling users to quickly add or check tasks from anywhere in the system.
