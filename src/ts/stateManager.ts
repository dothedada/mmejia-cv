export class ParserState {
    private isHeader: boolean | null;
    private sections: Set<string>;

    constructor() {
        this.isHeader = null;
        this.sections = new Set();
    }

    get inHeader(): boolean | null {
        return this.isHeader;
    }

    setHeader(inHeader: boolean) {
        this.isHeader = inHeader;
    }

    findSection(section: string): boolean {
        return this.sections.has(section);
    }

    setSection(section: string) {
        this.sections.add(section);
    }
}

export class RenderState {
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
