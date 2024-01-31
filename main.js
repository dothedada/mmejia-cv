const visibilidadMenu = (() => {
    const menu = document.querySelector('.menu')
    const menuActivo = document.querySelector('#mostrarMenu')
    let scrollInicial = window.scrollY

    window.addEventListener('scroll', () => {
        if (menuActivo.checked || window.scrollY < 5) return
        if (window.scrollY > scrollInicial) {
            menu.classList.add('menu--hide')
        } else {
            menu.classList.remove('menu--hide')
        }
        scrollInicial = window.scrollY
    })
    
    for (const botonMenu of menu.lastElementChild.children) {
        botonMenu.addEventListener('click', () => {
            menuActivo.checked = false
        })
    }
})()

const filtrarPortafolio = (() => {
    const botones = document.querySelector('.portfolio__filter')
    const portafolio = document.querySelectorAll('.portfolio__card')

    botones.addEventListener('click', e => {
        if (!e.target.getAttribute('data-filter')) return
        const filtro = e.target.getAttribute('data-filter')

        document.querySelector('.filter__active').classList.remove('filter__active')
        e.target.classList.add('filter__active')

        for (const proyecto of portafolio) {
            proyecto.classList.remove('hidden')
            if (filtro === 'todo') continue
            if (!proyecto.getAttribute('data-filter').match(filtro)) {
                proyecto.classList.add('hidden')
            }
        }
    })
})() 

const mostrarDetallePortafolio = (() => {
    for (const botonVer of document.querySelectorAll('.botonesVerMas')) {
        botonVer.addEventListener('click', boton => {
            document.getElementById(boton.target.getAttribute('data-window'))
                .showModal()
        })
    }
    for (const botonCerrar of document.querySelectorAll('.cerrarModal')) {
        botonCerrar.addEventListener('click', boton => {
            boton.target.closest('dialog').close()
        })
    }
    for (const modal of document.querySelectorAll('dialog')) {
        modal.addEventListener('click', e => {
            if (e.clientX < modal.getBoundingClientRect().left || 
                e.clientX > modal.getBoundingClientRect().right || 
                e.clientY < modal.getBoundingClientRect().top ||
                e.clientY > modal.getBoundingClientRect().bottom) modal.close()
        })
    }
})()

const envioCorreo = (() => {
	const formulario = document.querySelector("form");
	const resultado = document.getElementById("resultado");
    formulario.addEventListener("submit", event => {
        event.preventDefault();
        event.stopPropagation();
        if (!formulario.checkValidity()) {
            formulario.querySelectorAll(":invalid")[0].focus();
        } else {
            const formData = new FormData(formulario);
            const object = Object.fromEntries(formData);
            const json = JSON.stringify(object);
            resultado.textContent = 'Enviando...';

            fetch("https://api.web3forms.com/submit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: json,
            })
                .then(async (response) => {
                    const json = await response.json();
                    if (response.status === 200) {
                        resultado.textContent = json.message;
                    } else {
                        console.log(response);
                        resultado.textContent = json.message;
                    }
                })
                .catch((error) => {
                    console.log(error);
                    resultado.textContent = 'Algo salió mal, inténtalo más tarde o contáctame directamente.';
                })
                .then(() => {
                    formulario.reset();
                    formulario.classList.remove("was-validated");
                    resultado.textContent = 'Gracias por escribirme, pronto me estaré poniendo en contacto :)';
                    setTimeout(() => resultado.classList.add("hidden"), 4000);
                });
        }
        formulario.classList.add("was-validated");
    },
        false
    );
})();
