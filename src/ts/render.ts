import { getLang } from './lang';
import { RenderState } from './stateManager';
import { keySanitizer, textFormatter, textSanitizer } from './textModifiers';

import {
    Header,
    ParsedToken,
    Render,
    SectionToken,
    HeadingToken,
    LinkToken,
    ImgToken,
    DecoratorToken,
    ParagraphToken,
    ListToken,
    DataPointToken,
    ParsedDocument,
    SideFile,
    Page,
    HeaderValue,
} from './types';
import uiSr_txt from './ui-sr_txt';

export class Renderer {
    private state: RenderState;
    private sideFiles: SideFile;
    private modals: Record<string, string>;

    constructor() {
        this.state = new RenderState();
        this.modals = {};
    }

    renderMarkdown(parsedDocument: ParsedDocument): Page {
        const { body, sideFiles, header } = parsedDocument;
        this.sideFiles = sideFiles;

        let html = '';
        for (const line of body) {
            html += this.renderToken(line);
        }

        html += this.state.inSubsection ? this.closeSubsection() : '';
        html += this.state.inSection ? this.closeSection() : '';
        if (Object.keys(this.modals).length) {
            for (const modal of Object.keys(this.modals)) {
                html += this.dialogRenderer(modal, this.modals[modal]);
            }
        }
        if (header) {
            html += this.footerRender(header);
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
            decorator: (t) => this.decoratorRenderer(t as DecoratorToken),
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
        return `${prefix}<div class="subsection">\n`;
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
        let prefix = '';

        if (this.state.inSubsection) {
            prefix = this.closeSubsection();
        }

        if (token.target) {
            attr = ` target="_blank"`;
        } else if (token.type) {
            attr = ` download="${token.download}" type="application/pdf"`;
        }
        return `${prefix}<a href="${token.href}"${attr}>${token.content}</a>\n`;
    }

    private ruleRenderer(): string {
        let prefix = '';
        if (this.state.inSubsection) {
            prefix = this.closeSubsection();
        }
        return `${prefix}<hr>\n`;
    }

    private imgRenderer(token: ImgToken): string {
        let prefix = this.closeList();
        if (this.state.inSubsection) {
            prefix += this.closeSubsection();
        }
        const img = `<img loading="lazy" alt="${token.alt}" src="${token.src}">\n`;
        if (token.figCaption) {
            return `${prefix}<figure>\n${img}<figcaption>${token.figCaption}\n</figcaption>\n</figure>`;
        }
        return `${prefix}${img}`;
    }

    private decoratorRenderer(token: DecoratorToken): string {
        let attr = '';
        if (token.class) {
            attr += ` class="${token.class}"`;
        }
        return `<div${attr} aria-hidden="true">${token.content}</div>\n`;
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

    private dialogRenderer(id: string, contentHtml: string): string {
        const lang = getLang();
        let html = `<dialog id="${id}">\n`;
        html += `<button type="button" class="dialog__closeBtn">${uiSr_txt[lang].closeBtn}</button>\n`;
        html += contentHtml;
        html += '</dialog>';
        return html;
    }

    private cardRenderer(item: Header, id: string): string {
        const lang = getLang();

        const displayText = (item: HeaderValue): string => {
            let text = '';
            if (Array.isArray(item)) {
                text = item.reduce((string, current, index, { length }) => {
                    string += current;
                    if (index === length - 1) {
                        string += '.';
                    } else if (index === length - 2) {
                        string += lang === 'es' ? ' y ' : ' and ';
                    } else {
                        string += ', ';
                    }
                    return string;
                }, '');
            } else if (typeof item === 'string') {
                text = item;
            }

            return textFormatter(textSanitizer(text));
        };

        let html = `<div class="card" data-modal="${id}">\n`;
        html += `<h3>${displayText(item.title)}</h3>\n`;
        html += `<p>${displayText(item.summary)}</p>\n`;
        html += `<img alt="${item.previewTxt}" src="${item.preview}">\n`;
        html += `<div>\n`;
        html += `${item.aditionalData ? `<p>${displayText(item.aditionalData)}</p>\n` : ''}`;
        html += `${item.stack ? `<p>${displayText(item.stack)}</p>\n` : ''}`;
        html += `</div>\n`;
        html += `<div class="card__links">\n`;
        html += `<button type="button" class="card__btn" data-target="${id}">${uiSr_txt[lang].card.viewMore}</button>\n`;
        html += `${item.url ? `<a href="${item.url}" target="_blank" rel="noopener noreferrer">${uiSr_txt[lang].card.viewProject}</a>\n` : ''}`;
        html += `${item.repository ? `<a href="${item.repository}" target="_blank" rel="noopener noreferrer">${uiSr_txt[lang].card.viewRepository}</a>\n` : ''}`;
        html += '</div>\n';
        html += `</div>\n`;

        return html;
    }

    private footerRender(header: Header): string {
        const { date, footerTxt } = header;
        return `<footer>${footerTxt} - ${date}</footer>`;
    }
}
