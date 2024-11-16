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

export default fileFetcher;
