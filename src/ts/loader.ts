type Lang = 'es' | 'en';
type LoadedData = {
    data: string | null;
    onError: string[];
};

const dataLoader = async (
    lang: Lang,
    folder?: string,
    filename?: string,
): Promise<LoadedData> => {
    let filePath = '/assets/data/';
    filePath += !folder ? `${lang}.md` : `${folder}/${lang}/${filename}`;

    let data: string | null = null;
    let onError: string[] = [];
    try {
        const loader = await fetch(filePath);

        if (!loader.ok) {
            throw new Error(`${loader.status}`);
        }

        data = await loader.text();

        if (!data) {
            throw new Error(`Unknown error while loading '${filePath}'.`);
        }
    } catch (err) {
        onError.push(`Error loading the file ${filePath}.\nDetails: ${err}`);
    } finally {
        return { data, onError };
    }
};

export { dataLoader };
