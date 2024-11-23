export type ParsedToken =
    | SectionToken
    | DivToken
    | HeadingToken
    | LinkToken
    | ImgToken
    | ParagraphToken
    | ListToken
    | HorizontalRuleToken;

export interface SectionToken {
    label: 'section';
    name: string;
}
export interface DivToken {
    label: 'div';
    id?: string;
    class?: string;
    content: string;
}
export interface HeadingToken {
    label: 'h';
    level: number;
    id: string;
    content: string;
}
export interface LinkToken {
    label: 'a';
    href: string;
    download?: string;
    type?: 'application/pdf';
    target?: '_blank';
    content: string;
}
export interface ImgToken {
    label: 'img';
    src: string;
    alt: string;
}
export interface ParagraphToken {
    label: 'p';
    content: string;
}
export interface ListToken {
    label: 'li';
    content: string;
    indent: number;
}
export interface HorizontalRuleToken {
    label: 'hr';
}
export type Parser = (sectionData: string) => ParsedToken | void;
export type Render = (data: ParsedToken) => string;
export type Header = Record<string, string | string[]>;
export interface Page {
    menu: string;
    html: string;
    header: Header;
}
