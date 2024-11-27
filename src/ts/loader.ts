type Lang = 'es' | 'en';

const dataLoader = async (
    lang: Lang,
    folder?: string,
    filename?: string,
): Promise<string> => {
    const mdFiles = import.meta.glob('../assets/data/**/*.md', {
        query: '?raw',
        import: 'default',
    });

    let filePath = '../assets/data/';
    const fileFallback = '../assets/data/fallback.md';
    if (!folder) {
        filePath += `${lang}.md`;
    } else {
        filePath += `${folder}/${lang}/${filename}`;
    }
    const loader = mdFiles[filePath]; //|| mdFiles[fileFallback];

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
