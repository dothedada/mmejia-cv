export type Lang = 'es' | 'en';
export type HeaderToken = {
    indent: number;
} & (
    | {
          type: 'keyValue';
          key: string;
          value: string;
      }
    | {
          type: 'key';
          key: string;
      }
    | {
          type: 'value';
          value: string;
      }
);
export type ParsedToken =
    | SectionToken
    | DecoratorToken
    | HeadingToken
    | LinkToken
    | ImgToken
    | ParagraphToken
    | ListToken
    | HorizontalRuleToken
    | DataPointToken;

export interface SectionToken {
    label: 'section';
    name: string;
    id: string;
}
export interface DecoratorToken {
    label: 'decorator';
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
    figCaption: string | undefined;
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
export interface DataPointToken {
    label: 'dataPoint';
    content: string;
}

export type Parsers = (sectionData: string) => ParsedToken | void;
export type Render = (data: ParsedToken) => string;
export type HeaderValue = string | string[] | Record<string, HeaderValue[]>;
export interface Header {
    [key: string]: HeaderValue;
}
export type SideFile = Record<string, ParsedDocument[]> | null | undefined;
export interface ParsedDocument {
    header: Header | null;
    body: ParsedToken[];
    sideFiles?: SideFile;
}
export type HeaderParser = (sectionData: string) => HeaderToken | void;
export interface Page {
    menu: string;
    html: string;
}
