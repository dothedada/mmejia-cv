import { Parser, ParsedToken, HeaderParser } from './types';

class ParserState {
    private isHeader: boolean | null;
    private sections: string[];
    private isSectionOpen: boolean;
    private isSubsectionOpen: boolean;
    private listLevel: number | null;

    constructor() {
        this.isHeader = null;
        this.sections = [];
        this.isSectionOpen = false;
        this.isSubsectionOpen = false;
        this.listLevel = null;
    }

    get inHeader(): boolean | null {
        return this.isHeader;
    }

    setHeader(inHeader: boolean) {
        this.isHeader = inHeader;
    }

    get currentSection(): string {
        return this.sections[this.sections.length - 1];
    }

    get inSection(): boolean {
        return this.isSectionOpen;
    }

    setInSection(openSection: boolean) {
        this.isSectionOpen = openSection;
    }

    get showSections(): string[] {
        return this.sections;
    }

    setSection(section: string) {
        this.sections.push(section);
        this.setInSection(true);
    }

    get inSubsection(): boolean {
        return this.isSubsectionOpen;
    }

    setSubsection(setOpen: boolean) {
        this.isSubsectionOpen = setOpen;
    }

    get currentListLevel(): number | null {
        return this.listLevel;
    }

    setListLevel(indentation: number | null) {
        this.listLevel = indentation;
    }
}

const hasFrontMatter: HeaderParser = (sectionData, state) => {
    const frontMatterRegex = /^---$/;
    if (frontMatterRegex.test(sectionData)) {
        state.setHeader(true);
    }
};

const fmCloseFrontMatter: HeaderParser = (sectionData, state) => {
    const frontMatterRegex = /^---$/;
    if (state.inHeader && sectionData.match(frontMatterRegex)) {
        state.setHeader(false);
    }
};

const fmKeyValueParser: HeaderParser = (sectionData, state) => {
    if (!state.inHeader) {
        return;
    }
    const fmKeyValueRegex = /^( +)?(.+):(?: +)(.+)$/;
    const fmKeyValueMatch = sectionData.match(fmKeyValueRegex);

    if (!fmKeyValueMatch) {
        return;
    }

    const [, indent, key, value] = fmKeyValueMatch;

    return {
        type: 'keyValue',
        indent: indent.length,
        key: key
            .replace(/[^\w0-9-_]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, ''),
        value,
    };
};

const fmDataContainerParser: HeaderParser = (sectionData, state) => {
    if (!state.inHeader) {
        return;
    }

    const fmDataContainerRegex = /^( +)?(.+):(?: +)?$/;
    const fmDataContainerMatch = sectionData.match(fmDataContainerRegex);

    if (!fmDataContainerMatch) {
        return;
    }

    const [, indent, key] = fmDataContainerMatch;

    return {
        type: 'key',
        indent: indent.length,
        key: key
            .replace(/[^\w0-9-_]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, ''),
    };
};

const fmDataItemParser: HeaderParser = (sectionData, state) => {
    if (!state.inHeader) {
        return;
    }

    const fmDataItemRegex = /^( +)?- *(.+)$/;
    const fmDataItemMatch = sectionData.match(fmDataItemRegex);

    if (!fmDataItemMatch) {
        return;
    }

    const [, indent, value] = fmDataItemMatch;

    return {
        type: 'value',
        indent: indent.length,
        value,
    };
};

const sectionParser: Parser = (sectionData) => {
    const sectionRegex = /---\((.*)\)/;
    const section = sectionData.match(sectionRegex);

    if (!section) {
        return;
    }

    return { label: 'section', name: section[1] };
};

const headingsParser: Parser = (sectionData) => {
    const headingRegex = /^(#{1,6})\s*(.+)$/;
    const headingArray = sectionData.match(headingRegex);
    if (!headingArray) {
        return;
    }

    const [, hashes, heading] = headingArray;

    if (hashes.length < 1 || hashes.length > 6) {
        throw new Error(`Invalid Headin level: ${hashes.length}`);
    }

    return {
        label: 'h',
        level: hashes.length,
        content: heading,
        id: heading
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]/g, ''),
    };
};

const decoratorParser: Parser = (sectionData) => {
    const decoratorRegex = /^\/\/\s(.+)$/;
    const decoratorArray = sectionData.match(decoratorRegex);
    if (!decoratorArray) {
        return;
    }

    return {
        label: 'div',
        class: 'decorator',
        content: decoratorArray[1],
    };
};

const linkParser: Parser = (sectionData) => {
    const linkRegex = /^\[(.+)\]\((.+)\)([DB])?/;
    const filenameRegex = /\/((?!.+\/).+\.[\w\d]{3})/;
    const linkArray = sectionData.match(linkRegex);
    if (!linkArray) {
        return;
    }

    const [, linkTxt, link, linkType] = linkArray;
    if (!link.trim()) {
        throw new Error(`Invalid link in: "${sectionData}"`);
    }

    const linkProps: ParsedToken = {
        label: 'a',
        href: link.trim(),
        content: linkTxt.trim() || link.trim(),
    };
    if (linkType === 'D') {
        const filename = link.match(filenameRegex)?.[1] || 'myDownload.pdf';
        linkProps.download = filename;
        linkProps.type = 'application/pdf';
    } else if (linkType === 'B') {
        linkProps.target = '_blank';
    }

    return linkProps;
};

const imgParser: Parser = (sectionData) => {
    const imgRegex = /!\[(.+)\]\((.+)\)/;
    const imgArray = sectionData.match(imgRegex);
    if (!imgArray) {
        return;
    }

    const [, imgAlt, imgSrc] = imgArray;
    if (!imgAlt.trim() || !imgSrc.trim()) {
        throw new Error(`Invalid image or alternate text in: "${sectionData}"`);
    }

    return {
        label: 'img',
        alt: imgAlt.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
        src: imgSrc.replace(/"/g, '&quot;'),
    };
};

const hrParser: Parser = (sectionData) => {
    const dividerRegex = /^---$/;
    if (!sectionData.match(dividerRegex)) {
        return;
    }

    return { label: 'hr' };
};

const listParser: Parser = (sectionData) => {
    const listRegex = /^( +)?[-] +(.+)$/;
    const listItem = sectionData.match(listRegex);

    if (!listItem) {
        return;
    }

    const [, indent, item] = listItem;
    const indentCount = Math.floor(indent?.length / 4) || 0;

    return {
        label: 'li',
        content: item,
        indent: indentCount,
    };
};

const paragraphParser: Parser = (sectionData) => {
    const strongRegex = /\*\*([\w\s]+)\*\*/g;
    const emphasisRegex = /\*(.+)\*/g;
    const linkInParRegex = /\[(.+)\]\((.+)\)([BD])?/g;
    const text = sectionData.trim();

    if (!text) {
        return;
    }

    const replaceLink = (text: string, href: string, type?: string): string => {
        let attr = '';
        if (type === 'B') {
            attr = ' target="_blank"';
        } else if (type === 'D') {
            const filenameRegex = /\/((?!.+\/).+\.[\w\d]{3})/;
            const filename = href.match(filenameRegex)?.[1] || 'myDownload.pdf';
            attr = ` download="${filename}" type="application/pdf"`;
        }
        return `<a href="${href.trim()}"${attr}>${text.trim() || href.trim()}</a>`;
    };

    return {
        label: 'p',
        content: text
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt')
            .replace(strongRegex, '<strong>$1</strong>')
            .replace(emphasisRegex, '<em>$1</em>')
            .replace(linkInParRegex, replaceLink),
    };
};

const dataPointParser: Parser = (sectionData) => {
    const injectionPointRegex = /^@@ *(.+)$/;
    const injectionPointMatch = sectionData.match(injectionPointRegex);

    if (!injectionPointMatch) {
        return;
    }

    return {
        label: 'dataPoint',
        content: injectionPointMatch[1],
    };
};

export {
    ParserState,
    hasFrontMatter,
    fmCloseFrontMatter,
    fmKeyValueParser,
    fmDataContainerParser,
    fmDataItemParser,
    sectionParser,
    headingsParser,
    hrParser,
    listParser,
    linkParser,
    imgParser,
    decoratorParser,
    paragraphParser,
    dataPointParser as injectionDataPoint,
};
