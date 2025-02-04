type Lang = 'es' | 'en';
type LoadedData = {
    data: string | null;
    loaded: boolean;
    onError: string[];
};

const dataLoader = async (
    lang: Lang,
    folder?: string,
    filename?: string,
): Promise<LoadedData> => {
    let filePath = '/assets/data/a';
    filePath += !folder ? `${lang}.md` : `${folder}/${lang}/${filename}`;

    let data: string | null = null;
    let loaded: boolean = false;
    let onError: string[] = [];
    try {
        const loader = await fetch(filePath);

        if (!loader.ok) {
            throw new Error(`Error: ${loader.status}`);
        }

        data = await loader.text();

        if (!data) {
            throw new Error(`Unknown error while loading '${filePath}'.`);
        }
    } catch (err) {
        onError.push(`Error loading the file ${filePath}.\nDetails: ${err}`);
    } finally {
        loaded = true;
        return { data, loaded, onError };
    }
};

export { dataLoader };
