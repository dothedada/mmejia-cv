export class ParserState {
    private isHeader: boolean | null;
    private dataInjector: Set<string>;

    constructor() {
        this.isHeader = null;
        this.dataInjector = new Set();
    }

    get inHeader(): boolean | null {
        return this.isHeader;
    }

    setDataInjector(dataPoint: string) {
        this.dataInjector.add(dataPoint);
    }

    findDataInjector(datapoint: string) {
        return this.dataInjector.has(datapoint);
    }

    setHeader(inHeader: boolean) {
        this.isHeader = inHeader;
    }
}

type ParsedSection = [id: string, name: string];
export class RenderState {
    private sections: ParsedSection[];
    private isSectionOpen: boolean;
    private isSubsectionOpen: boolean;
    private listLevel: number | null;

    constructor() {
        this.sections = [];
        this.isSectionOpen = false;
        this.isSubsectionOpen = false;
        this.listLevel = null;
    }

    get currentSection(): ParsedSection {
        return this.sections[this.sections.length - 1];
    }

    get inSection(): boolean {
        return this.isSectionOpen;
    }

    setInSection(openSection: boolean) {
        this.isSectionOpen = openSection;
    }

    get showSections(): ParsedSection[] {
        return this.sections;
    }

    setSection(section: ParsedSection) {
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
