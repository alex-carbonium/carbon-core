export class NameProvider {
    public static escapeName(name: string): string {
        return name.replace(/[ \[\]\(\)\.\,\\\/\~\@\#\%\^\&\*]/gm, '_');
    }
}