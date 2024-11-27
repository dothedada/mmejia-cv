import { getLang } from './lang';
import { RenderState } from './stateManager';
import { keySanitizer } from './textModifiers';

import {
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
    DataPointToken,
    ParsedDocument,
    SideFile,
    Page,
} from './types';
import uiSr_txt from './ui-sr_txt';

// NOTE:
// 1. arreglar lo de congelar el sitio cuando la pantalla esta en blur
// 2. linkear los botones de ver mas
// 3. crear el footer con la fecha
// 4. implementar estilos de los elementos
// poblar :D

export class Renderer {
    private state: RenderState;
    private sideFiles: SideFile;
    private modals: Record<string, string>;

    constructor() {
        this.state = new RenderState();
        this.modals = {};
    }

    renderMarkdown(parsedDocument: ParsedDocument): Page {
        const { body, sideFiles } = parsedDocument;
        this.sideFiles = sideFiles;

        let html = '';
        for (const line of body) {
            html += this.renderToken(line);
        }

        html += this.state.inSubsection ? this.closeSubsection() : '';
        html += this.state.inSection ? this.closeSection() : '';
        if (Object.keys(this.modals).length) {
            for (const modal of Object.keys(this.modals)) {
                html += `<dialog id="${modal}">${this.modals[modal]}</dialog>`;
            }
        }

        let menuItems = '\n';
        for (const section of this.state.showSections) {
            menuItems += `<li><a href="#${section[0]}">${section[1]}</a></li>\n`;
        }

        return { html, menu: menuItems };
    }

    private renderToken(token: ParsedToken): string {
        const renderers: Record<string, Render> = {
            section: (t) => this.sectionRenderer(t as SectionToken),
            h: (t) => this.headingRenderer(t as HeadingToken),
            a: (t) => this.linkRenderer(t as LinkToken),
            hr: () => this.ruleRenderer(),
            img: (t) => this.imgRenderer(t as ImgToken),
            div: (t) => this.divRenderer(t as DivToken),
            p: (t) => this.paragraphRenderer(t as ParagraphToken),
            li: (t) => this.listRenderer(t as ListToken),
            dataPoint: (t) => this.dataPointRenderer(t as DataPointToken),
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
        return `${prefix}</div>\n`;
    }

    private closeSection(): string {
        this.state.setInSection(false);
        const prefix = this.state.inSubsection ? this.closeSubsection() : '';
        return `${prefix}</section>\n`;
    }

    private openSubsection(): string {
        let prefix = '';
        if (this.state.inSubsection) {
            prefix += this.closeSubsection();
        }
        this.state.setSubsection(true);
        return `${prefix}<div class="sub lala">\n`;
    }

    private sectionRenderer(token: SectionToken): string {
        let prefix = '';
        if (token.name === '') {
            return this.closeSection();
        }
        if (this.state.inSection) {
            prefix = this.closeSection();
        }
        if (this.state.currentSection?.[1] === token.name) {
            return prefix;
        }
        this.state.setSection([token.id, token.name]);
        return `${prefix}<section id="${token.name}">\n`;
    }

    private headingRenderer(token: HeadingToken): string {
        let prefix = ``;
        if (this.state.inSubsection && token.level < 3) {
            prefix = this.closeSubsection();
        } else if (token.level === 3) {
            prefix = this.openSubsection();
        } else {
            prefix = this.closeList();
        }

        return `${prefix}<h${token.level} id="${token.id}">${token.content}</h${token.level}>\n`;
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
        const img = `<img alt="${token.alt}" src="${token.src}">\n`;
        if (token.figCaption) {
            return `${prefix}<figure>\n${img}<figcaption>${token.figCaption}\n</figcaption>\n<figure>`;
        }
        return `${prefix}${img}`;
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

    private dataPointRenderer(token: DataPointToken): string {
        if (!this.sideFiles) {
            return 'no sidefile to inject';
        }

        if (!(token.content in this.sideFiles)) {
            throw new Error(
                `there is ${token.content} in the parsed files to inkject in frontmatter`,
            );
        }

        let html = '';
        const sideFilesToInject = this.sideFiles[token.content];

        for (const file of sideFilesToInject) {
            const { header, body } = file;

            if (header) {
                const id = keySanitizer(
                    `${header.title}${Math.round(Math.random() * 100)}`,
                );
                let modalBody = '';
                for (const line of body) {
                    modalBody += this.renderToken(line);
                }
                this.modals[id] = modalBody;
                html += this.cardRenderer(header, id);
            }
        }

        return `\t<div id="${token.content}">\n${html}\n\t</div>\n`;
    }

    private cardRenderer(item: Header, id: string): string {
        const lang = getLang();
        return `
        <div class="card" data-modal="${id}">
            <h3>${item.title}</h3>
            <p>${item.summary}</p>
            <img alt="${item.previewTxt}" src="${item.preview}">
            <p>${item.aditionalData}</p>
            <p>${item.stack}</p>
            <button type="button">${uiSr_txt[lang].card.viewMore}</button>
            <a href="${item.url}" target="_blank" rel="noopener noreferrer">
                ${uiSr_txt[lang].card.viewProject}
            </a>
            <a href="${item.repository}" target="_blank" rel="noopener noreferrer">
                ${uiSr_txt[lang].card.viewRepository}
            </a>

        </div>
    `.trim();
    }
}
