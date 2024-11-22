type Lang = 'es' | 'en';

const dataLoader = async (lang: Lang): Promise<string> => {
    const mdFiles = import.meta.glob('../assets/data/*.md', {
        query: '?raw',
        import: 'default',
    });
    const filePath = `../assets/data/${lang}.md`;
    const fileFallback = '../assets/data/fallback.md';
    const loader = mdFiles[filePath] || mdFiles[fileFallback];

    if (!loader) {
        throw new Error(
            `Can not find the file '${filePath}' nor the backup file '${fileFallback}'`,
        );
    }

    try {
        const content = await loader();

        if (typeof content !== 'string') {
            throw new Error(`Unknown error while loading '${filePath}'.`);
        }

        return content;
    } catch (err) {
        throw new Error(`Error while loading the data file in ${lang}`);
    }
};

export { dataLoader };
