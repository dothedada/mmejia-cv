import {
    ParserState,
    sectionParser,
    headingsParser,
    hrParser,
    listParser,
    linkParser,
    imgParser,
    decoratorParser,
    paragraphParser,
} from './parser';

import {
    Parser,
    Page,
    Header,
    ParsedToken,
    Render,
    SectionToken,
    HeadingToken,
    LinkToken,
    ImgToken,
    DivToken,
    ParagraphToken,
    ListToken,
} from './types';

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

    renderMarkdown(markdown: string): Page {
        const [header, body] = this.getDocumentStructure(markdown);
        const menuItems = this.state.showSections.join(' ');

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

        html += this.state.inSubsection ? this.closeSubsection() : '';
        html += this.state.inSection ? this.closeSection() : '';

        return { html, menu: menuItems, header };
    }

    private getDocumentStructure(markdown: string): [Header, string] {
        const headerRegex = /---([\s\S]*?)---\n([\s\S]*)/;
        const dataSplit = markdown.match(headerRegex);

        if (!dataSplit || dataSplit.length !== 3) {
            throw new Error('Invalid frontmatter format');
        }

        const [, headerString, bodyString] = dataSplit;
        const header: Header = {};
        let currentList = '';

        for (const rawLine of headerString.split('\n')) {
            const line = rawLine.trim();
            if (!line) continue;

            if (line.includes(': ')) {
                const [key, ...value] = line.split(': ');
                header[key] = value.join(': ').trim();
                continue;
            }

            if (line.endsWith(':')) {
                currentList = line.slice(0, -1);
                header[currentList] = [];
                continue;
            }

            const listItem = line.match(/^-\s*(.+)$/);

            if (listItem) {
                const array = header[currentList];
                if (!Array.isArray(array)) {
                    throw new Error(`Expected an Array`);
                }
                array.push(listItem[1]);
                continue;
            }

            throw new Error(`Invalid item in list format: ${line}`);
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

        return renderers[token.label](token) || '\n';
    }

    private closeList(): string {
        if (this.state.currentListLevel === null) {
            return ``;
        }
        let prefix = '';
        while (this.state.currentListLevel > 0) {
            prefix += '</ul>\n</li>\n';
            this.state.setListLevel(this.state.currentListLevel - 1);
        }
        this.state.setListLevel(null);
        return `${prefix}</ul>\n`;
    }

    private closeSubsection(): string {
        this.state.setSubsection(false);
        const prefix = this.closeList();
        return `${prefix}\t</div>\n`;
    }

    private closeSection(): string {
        this.state.setInSection(false);
        const prefix = this.state.inSubsection ? this.closeSubsection() : '';
        return `${prefix}</section>\n\n`;
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
        let prefix = '';
        if (token.name === '') {
            return this.closeSection();
        }
        if (this.state.inSection) {
            prefix = this.closeSection();
        }
        if (this.state.currentSection === token.name) {
            return prefix;
        }
        this.state.setSection(token.name);
        return `${prefix}<section id="${token.name}">\n`;
    }

    private headingRenderer(token: HeadingToken): string {
        let prefix = ``;
        if (this.state.inSubsection && /^h[1-2]$/.test(token.label)) {
            prefix = this.closeSubsection();
        } else if (/^h3$/.test(token.label)) {
            prefix = this.openSubsection();
        } else {
            prefix = this.closeList();
        }
        return `${prefix}<${token.label} id="${token.id}">${token.content}</${token.label}>\n`;
    }

    private linkRenderer(token: LinkToken): string {
        let attr = '';

        if (token.target) {
            attr = ` target="_blank"`;
        } else if (token.type) {
            attr = ` download="${token.download}" type="application/pdf"`;
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
        const prefix = this.closeList();
        return `${prefix}<img alt="${token.alt}" src="${token.src}">\n`;
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
        prefix += this.closeList();
        if (!this.state.inSubsection) {
            prefix = this.openSubsection();
        }
        return `${prefix}<p>${token.content}</p>\n`;
    }

    private listRenderer(token: ListToken): string {
        let prefix = '';
        if (this.state.currentListLevel === null) {
            prefix = '<ul>\n';
        } else if (token.indent > this.state.currentListLevel) {
            prefix = '<li>\n<ul>\n';
        } else if (token.indent < this.state.currentListLevel) {
            prefix = '\n</ul>\n</li>\n';
        }
        this.state.setListLevel(token.indent);

        return `${prefix}<li>${token.content}</li>\n`;
    }
}
