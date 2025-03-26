---
date: 2025-03-15
title: Solo5
summary: Solo5 es una herramienta de línea de comandos para organizar y priorizar tareas de forma local, sin depender de servicios externos. Analiza fechas y niveles de urgencia para ajustar automáticamente las prioridades. Su sistema de tokenización flexible permite interpretar fechas escritas en lenguaje natural y en distintos formatos e idiomas. Diseñada para ser accesible y fácilmente traducible.
aditionalData: Creación de herramientas, multilenguaje
stack:
    - Python
preview: /assets/img/portadas/solo5.gif
repository: https://github.com/dothedada/solo5
---

## Solo5

![](/assets/img/solo5/home.jpg){Pantala de inicio de Solo5}

Solo5 es una aplicación de línea de comandos diseñada para organizar y priorizar tareas diarias de manera rápida y eficiente. A diferencia de otras herramientas de productividad, Solo5 se enfoca en cinco tareas significativas al día, promoviendo la concentración y una gestión del tiempo más saludable.

Todo el procesamiento se realiza de forma local, sin depender de servicios externos de procesamiento de lenguaje natural, inteligencia artificial o almacenamiento en la nube. Esto garantiza la privacidad del usuario y evita el uso de su información, además de ofrecer un rendimiento óptimo sin necesidad de conexión a internet.

![](/assets/img/solo5/search.jpg){Búsqueda de tareas}

El sistema de priorización es flexible y se adapta al flujo de trabajo del usuario. A partir de la descripción de cada tarea, la aplicación analiza la fecha de finalización, si es inaplazable y su nivel de dificultad. Con esta información, determina su urgencia y el momento más adecuado para su realización. Además, el sistema ajusta automáticamente las prioridades a medida que se ingresan nuevas tareas, reevaluándolas cada día para optimizar la gestión del tiempo sin requerir intervención manual.

Dado que la forma en que expresamos nuestras tareas varía entre idiomas e incluso entre dialectos, la accesibilidad fue una prioridad en el diseño y desarrollo. La aplicación facilita la traducción de la interfaz, los comandos y del sistema de tokenización que interpreta y prioriza las tareas, permitiendo agregar o modificar idiomas sin necesidad de cambiar el código fuente.

![](/assets/img/solo5/confirm.jpg){Confirmación de acciones}

Uno de los mayores desafíos fue mantener la flexibilidad del lenguaje mientras se interpretan correctamente las fechas. Solo5 utiliza expresiones regulares dentro de un sistema de tokenización capaz de capturar fechas escritas en distintos formatos, ya sean absolutas ("25 de marzo") o relativas ("el próximo viernes" o "de este viernes en dos semanas"). Este sistema es lo suficientemente flexible para adaptarse a la manera natural en que se expresan fechas en diferentes idiomas.

![](/assets/img/solo5/done.jpg){Visualización de avance en el día}

En el futuro, se espera implementar soporte para ejecutar comandos en una sola línea, lo que permitiría su integración con lanzadores de aplicaciones como Albert, Rofi y Ulauncher. Esto haría aún más accesible su uso, permitiendo agregar o consultar tareas rápidamente desde cualquier parte del sistema.
