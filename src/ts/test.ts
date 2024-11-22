interface Page {
    menu: string;
    document: string;
    header: Header;
}
type Header = Record<string, string | string[]>;
type SectionData = Map<string, string>;
type ParsedToken =
    | SectionToken
    | DivToken
    | HeadingToken
    | LinkToken
    | ImgToken
    | ParagraphToken
    | ListToken
    | HorizontalRuleToken;

interface SectionToken {
    label: 'section';
    name: string;
}
interface DivToken {
    label: 'div';
    id?: string;
    class?: string;
    content: string;
}
type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
interface HeadingToken {
    label: HeadingLevel;
    id: string;
    content: string;
}
interface LinkToken {
    label: 'a';
    href: string;
    download?: string;
    type?: 'application/pdf';
    target?: '_blank';
    content: string;
}
interface ImgToken {
    label: 'img';
    src: string;
    alt: string;
}
interface ParagraphToken {
    label: 'p';
    content: string;
}
interface ListToken {
    label: 'li';
    content: string;
    indent: number;
}
interface HorizontalRuleToken {
    label: 'hr';
}
type Parser = (sectionData: string) => ParsedToken | void;
type Render = (data: ParsedToken) => string;

class ParserState {
    private isSubsectionOpen: boolean;
    private listLevel: number | null;
    private isHeader: boolean;
    private sections: string[];

    constructor() {
        this.isSubsectionOpen = false;
        this.listLevel = null;
        this.isHeader = false;
        this.sections = [];
    }

    get inHeader(): boolean {
        return this.isHeader;
    }

    setHeader(inHeader: boolean) {
        this.isHeader = inHeader;
    }

    get currentSection(): string {
        return this.sections[this.sections.length - 1];
    }

    get showSections(): string[] {
        return this.sections;
    }

    setSection(section: string) {
        this.sections.push(section);
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

export class Renderer {
    private parsers: Parser[];
    private state: ParserState;

    constructor() {
        this.state = new ParserState();
        this.parsers = [
            sectionParser,
            headingsParser,
            hrParser,
            listParser,
            linkParser,
            imgParser,
            decoratorParser,
            paragraphParser,
        ];
    }

    renderMarkdown(markdown: string): string {
        const [header, body] = this.parseDocument(markdown);
        const menuItems = this.state.showSections;

        const lines = body.split('\n');
        let html = '';

        for (const line of lines) {
            for (const parser of this.parsers) {
                const token = parser(line);

                if (token) {
                    html += this.renderToken(token);
                    break;
                }
            }
        }

        console.log(menuItems);
        return html;
    }

    private parseDocument(markdown: string): [Header, string] {
        const headerRegex = /---([\s\S]*?)---\n([\s\S]*)/;
        const dataSplit = markdown.match(headerRegex);
        if (!dataSplit || dataSplit.length !== 3) {
            throw new Error('Invalid frontmatter format');
        }

        const [, headerString, bodyString] = dataSplit;
        const currentLevel: string[] = [];
        const header: Header = {};

        const headerLines = headerString.split('\n').map((line) => {
            const regexIndent = /^\s+/;
            return {
                string: line.trim(),
                indent: line.match(regexIndent)?.[0].length || 0,
            };
        });

        for (const { string: line, indent } of headerLines) {
            if (!line) {
                continue;
            }

            if (line.includes(': ')) {
                const [key, ...value] = line.split(': ');
                header[key] = value.join(': ').trim();
                continue;
            }

            if (line.endsWith(':')) {
                const hasParent = indent > 0;
                const level = hasParent ? line.slice(2, -1) : line.slice(0, -1);
                currentLevel.length = hasParent ? 1 : 0;
                currentLevel.push(level);
                continue;
            }

            const text = line.match(/^-\s*(.+)$/);

            if (!text) {
                throw new Error(`Invalid line format: ${text}`);
            }

            const cleanText = text[1];

            header[currentLevel[0]] = header[currentLevel[0]] ?? [];
            const targetArr = header[currentLevel[0]];

            if (!Array.isArray(targetArr)) {
                throw new Error(
                    `Expected an Array but found ${typeof targetArr}`,
                );
            }

            targetArr.push(cleanText);
        }

        return [header, bodyString];
    }

    private renderToken(token: ParsedToken): string {
        const renderers: Record<string, Render> = {
            section: (t) => this.sectionRenderer(t as SectionToken),
            h1: (t) => this.headingRenderer(t as HeadingToken),
            h2: (t) => this.headingRenderer(t as HeadingToken),
            h3: (t) => this.headingRenderer(t as HeadingToken),
            h4: (t) => this.headingRenderer(t as HeadingToken),
            h5: (t) => this.headingRenderer(t as HeadingToken),
            h6: (t) => this.headingRenderer(t as HeadingToken),
            a: (t) => this.linkRenderer(t as LinkToken),
            hr: () => this.ruleRenderer(),
            img: (t) => this.imgRenderer(t as ImgToken),
            div: (t) => this.divRenderer(t as DivToken),
            p: (t) => this.paragraphRenderer(t as ParagraphToken),
            li: (t) => this.listRenderer(t as ListToken),
        };

        return renderers[token.label](token) || '';
    }

    private closeSubsection(): string {
        this.state.setSubsection(false);
        return '\t</div>\n\n';
    }

    private openSubsection(): string {
        let prefix = '';
        if (this.state.inSubsection) {
            prefix += this.closeSubsection();
        }
        this.state.setSubsection(true);
        return `${prefix}\n\n\t<div class="sub lala">\n`;
    }

    private sectionRenderer(token: SectionToken): string {
        if (this.state.currentSection === token.name) {
            const prefix = this.state.inSubsection
                ? this.closeSubsection()
                : '';
            return `${prefix}</section>\n`;
        } else {
            this.state.setSection(token.name);
            return `<section id="${token.name}>\n`;
        }
    }

    private headingRenderer(token: HeadingToken): string {
        let prefix = ``;
        if (this.state.inSubsection && /^h[1-2]$/.test(token.label)) {
            prefix = this.closeSubsection();
        } else if (/^h3$/.test(token.label)) {
            prefix = this.openSubsection();
        }
        return `${prefix}<${token.label} id="${token.id}">${token.content}</${token.label}>\n`;
    }

    private linkRenderer(token: LinkToken): string {
        let attr = '';
        if (token.target) {
            attr = ` target="_blank"`;
        } else if (token.type) {
            attr = ` download="${token.download} type="application/pdf"`;
        }
        return `<a href="${token.href}"${attr}>${token.content}</a>\n`;
    }

    private ruleRenderer(): string {
        let prefix = '';
        prefix += `${this.state.inSubsection} `;
        if (this.state.inSubsection) {
            prefix = this.closeSubsection();
        }
        return `${prefix}<hr>\n`;
    }

    private imgRenderer(token: ImgToken): string {
        return `<img alt="${token.alt}" src="${token.src}">\n`;
    }

    private divRenderer(token: DivToken): string {
        let attr = '';
        if (token.id) {
            attr += ` id="${token.id}"`;
        }
        if (token.class) {
            attr += ` class="${token.class}"`;
        }
        return `<${token.label}${attr}>${token.content}</${token.label}>\n`;
    }

    private paragraphRenderer(token: ParagraphToken): string {
        let prefix = '';
        if (!this.state.inSubsection) {
            prefix = this.openSubsection();
        }
        return `${prefix}<p>${token.content}</p>\n`;
    }

    private listRenderer(token: ListToken): string {
        // NOTE: apertura ul
        // NOTE: cierre sub ul
        return `<li>${token.content}</li>\n`;
    }
}

const sectionParser: Parser = (sectionData) => {
    const sectionRegex = /---\((.+)\)/;
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
        label: `h${hashes.length}` as HeadingLevel,
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
    const indentCount = indent?.length || 0;

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
