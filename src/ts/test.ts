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
    | TextToken
    | LiToken
    | HrToken;

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
interface TextToken {
    label: 'p';
    content: string;
}
interface LiToken {
    label: 'li';
    content: string;
    indent: number;
}
interface HrToken {
    label: 'hr';
}
interface ParsingContext {
    listIndent: (number | null)[];
    isSubsectionOpen: boolean;
}
type Parser = (
    sectionData: string,
    context?: ParsingContext,
) => ParsedToken | void;
type Render = (data: ParsedToken) => string;

const headingsParser: Parser = (sectionData) => {
    const headingRegex = /^(#{1,6})\s*(.+)$/;
    const headingArray = sectionData.match(headingRegex);
    if (!headingArray) {
        return;
    }
    if (headingArray.length < 3) {
        throw new Error(`Could not parse the heading string ${sectionData}`);
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
    if (decoratorArray.length < 2) {
        throw new Error(`Could not parse the decorator string ${sectionData}`);
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
    if (linkArray.length < 4) {
        throw new Error(`Could not parse the link string ${sectionData}`);
    }

    const [, linkTxt, link, linkType] = linkArray;
    if (!linkTxt.trim() || !link.trim()) {
        throw new Error(`Invalid link or text in: "${sectionData}"`);
    }

    const linkProps: Partial<ParsedToken> = {
        label: 'a',
        href: link,
        content: linkTxt,
    };
    if (linkType === 'D') {
        const filename = link.match(filenameRegex)?.[1] || '';
        linkProps.download = filename;
        linkProps.type = 'application/pdf';
    } else if (linkType === 'B') {
        linkProps.target = '_blank';
    }

    return linkProps as ParsedToken;
};

const imgParser: Parser = (sectionData) => {
    const imgRegex = /!\[(.+)\]\((.+)\)/;
    const imgArray = sectionData.match(imgRegex);
    if (!imgArray) {
        return;
    }
    if (imgArray.length < 3) {
        throw new Error(`Could not parse the link string ${sectionData}`);
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

    return { type: 'hr' };
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
    const linkInParRegex = /\[.+\]\(.+\)[BD]?/g;
    const text = sectionData.trim();

    if (!text) {
        return;
    }

    return {
        label: 'p',
        content: text
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt')
            .replace(strongRegex, '<strong>$1</strong>')
            .replace(emphasisRegex, '<em>$1</em>'),
    };
};

const createElement: Render = (data) => {
    const { label, ...rest } = data;

    let attr = '';
    for (const [key, value] of Object.entries(rest)) {
        if (key === 'indent' || key === 'content') continue;
        attr += ` ${key}="${value}"`;
    }
    if (!('content' in rest)) {
        return `<${label}${attr}/>`;
    }

    const { content } = rest;

    return `<${label}${attr}>${content}</${label}>`;
};
