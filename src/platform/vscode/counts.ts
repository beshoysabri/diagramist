// The in-memory counts the diagnostic report shows (D6). Nothing is stored or sent anywhere.
export type CountName = "checks" | "diagramsChecked" | "errorsShown" | "warningsShown" | "toolErrors" | "versionChecks";

export class Counts {
  private readonly values = new Map<CountName, number>();

  add(name: CountName, by = 1): void {
    this.values.set(name, (this.values.get(name) ?? 0) + by);
  }

  snapshot(): Record<CountName, number> {
    const names: CountName[] = ["checks", "diagramsChecked", "errorsShown", "warningsShown", "toolErrors", "versionChecks"];
    return Object.fromEntries(names.map((name) => [name, this.values.get(name) ?? 0])) as Record<CountName, number>;
  }
}
