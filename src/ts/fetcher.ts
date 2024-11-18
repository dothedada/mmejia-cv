const fileFetcher = async (
    fileName = 'dataFiles/files.txt',
    timeout = 5000,
): Promise<string | void> => {
    const controller = new AbortController();
    const conectionTimeOut = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(fileName, { signal: controller.signal });
        if (!response.ok) {
            throw new Error(
                `Error ${response.status}. No se pudo obtener el archivo${fileName}`,
            );
        }
        const textData = await response.text();
        return textData;
    } catch (err) {
        if (err instanceof Error) {
            if (err.name === 'AbortError') {
                throw new Error('Error: Tiempo de conexion excedido');
            }
            throw new Error(
                `Error al obtener el archivo ${fileName}: ${err.name}`,
            );
        }
    } finally {
        clearTimeout(conectionTimeOut);
    }
};

const dataLoader = async (lang: string): Promise<string> => {
    const mdFiles = import.meta.glob('../assets/data/*.md', { as: 'raw' });
    const filePath = `../assets/data/${lang}.md`;
    const fileFallback = '..assets/data/fallback.md';
    const loader = mdFiles[filePath] || mdFiles[fileFallback];

    try {
        const content = await loader();
        return content;
    } catch (err) {
        throw new Error(`Error while loading the data file in ${lang}`);
    }
};

export { fileFetcher, dataLoader };
