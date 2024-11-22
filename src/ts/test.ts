interface Page {
    menu: string;
    document: string;
    header: Header;
}
type Header = Record<string, string | string[]>;
type SectionData = Map<string, string>;
type ParsedToken =
    | WrapperToken
    | HeadingToken
    | LinkToken
    | ImgToken
    | ParagraphToken
    | ListToken
    | HorizontalRuleToken;

interface WrapperToken {
    label: 'section' | 'div';
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
    private tokens: ParsedToken[];

    constructor() {
        this.isSubsectionOpen = false;
        this.listLevel = null;
        this.tokens = [];
    }

    set addToken(token: ParsedToken) {
        this.tokens.push(token);
    }

    get parsedTokens(): ParsedToken[] {
        return this.tokens;
    }

    set setSubsection(setOpen: boolean) {
        this.isSubsectionOpen = setOpen;
    }

    get inSubsection(): boolean {
        return this.isSubsectionOpen;
    }

    get currentListLevel(): number | null {
        return this.listLevel;
    }

    set setListLevel(indentation: number | null) {
        this.listLevel = indentation;
    }
}

class Renderer {
    private parsers: Parser[];
    private state: ParserState;

    constructor() {
        this.state = new ParserState();
        this.parsers = [
            headingsParser,
            hrParser,
            listParser,
            linkParser,
            imgParser,
            decoratorParser,
            paragraphParser,
        ];
    }

    private renderToken(token: ParsedToken): string {
        const renderers: Record<string, (t: ParsedToken) => string> = {
            h1: (t) => this.headingRenderer(t as HeadingToken),
            h2: (t) => this.headingRenderer(t as HeadingToken),
            h3: (t) => this.headingRenderer(t as HeadingToken),
            h4: (t) => this.headingRenderer(t as HeadingToken),
            h5: (t) => this.headingRenderer(t as HeadingToken),
            h6: (t) => this.headingRenderer(t as HeadingToken),
            a: (t) => this.linkRenderer(t as LinkToken),
            hr: () => this.ruleRenderer(),
            img: (t) => this.imgRenderer(t as ImgToken),
            div: (t) => this.wrapperRenderer(t as WrapperToken),
            section: (t) => this.wrapperRenderer(t as WrapperToken),
            p: (t) => this.paragraphRenderer(t as ParagraphToken),
            li: (t) => this.listRenderer(t as ListToken),
        };

        return renderers[token.label](token) || '';
    }

    private closeSubsection(): string {
        if (this.state.inSubsection) {
            this.state.setSubsection(false);
            return '\t</div>\n\n';
        }
        return '';
    }

    private openSubsection(): string {
        let prefix = '';
        if (this.state.inSubsection) {
            prefix += this.closeSubsection();
        }
        this.state.setSubsection(true);
        return `${prefix}\n\n\t<div class="sub lala">\n`;
    }

    private headingRenderer(token: HeadingToken): string {
        // NOTE: cierre de subsección
        // NOTE: apertura subseccion
        return `<${token.label} id="${token.id}">${token.content}</${token.label}>`;
    }

    private linkRenderer(token: LinkToken): string {
        let attr = '';
        if (token.target) {
            attr = ` target="_blank"`;
        } else if (token.type) {
            attr = ` download="${token.download} type="application/pdf"`;
        }
        return `<a href="${token.href}"${attr}>${token.content}</a>`;
    }

    private ruleRenderer(): string {
        // NOTE: cierre de subsección
        return '<hr>';
    }

    private imgRenderer(token: ImgToken): string {
        return `<img alt="${token.alt}" src="${token.src}">`;
    }

    private wrapperRenderer(token: WrapperToken): string {
        let attr = '';
        if (token.id) {
            attr += ` id="${token.id}"`;
        }
        if (token.class) {
            attr += ` class="${token.class}"`;
        }
        return `<${token.label}${attr}>${token.content}</${token.label}>`;
    }

    private paragraphRenderer(token: ParagraphToken): string {
        // NOTE: apertura subseccion
        return `<p>${token.content}</p>`;
    }

    private listRenderer(token: ListToken): string {
        // NOTE: apertura ul
        // NOTE: cierre sub ul
        return `<li>${token.label}</li>`;
    }
}

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
    const indentCount = indent.length || 0;

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

// const createElement: Render = (data) => {
//     const { label, ...rest } = data;
//
//     let attr = '';
//     for (const [key, value] of Object.entries(rest)) {
//         if (key === 'indent' || key === 'content') continue;
//         attr += ` ${key}="${value}"`;
//     }
//     if (!('content' in rest)) {
//         return `<${label}${attr}/>`;
//     }
//
//     const { content } = rest;
//
//     return `<${label}${attr}>${content}</${label}>`;
// };
