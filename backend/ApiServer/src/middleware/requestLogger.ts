import morgan from "morgan";

const ANSI = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    gray: "\x1b[90m",
};

function colorize(value: string, color: string): string {
    return `${color}${value}${ANSI.reset}`;
}

function methodColor(method: string): string {
    switch (method) {
        case "GET":
            return ANSI.blue;
        case "POST":
            return ANSI.green;
        case "PUT":
        case "PATCH":
            return ANSI.yellow;
        case "DELETE":
            return ANSI.red;
        default:
            return ANSI.magenta;
    }
}

function statusColor(statusCode: number): string {
    if (statusCode >= 500) return ANSI.red;
    if (statusCode >= 400) return ANSI.yellow;
    if (statusCode >= 300) return ANSI.cyan;
    return ANSI.green;
}

function responseTimeColor(ms: number): string {
    if (ms >= 1000) return ANSI.red;
    if (ms >= 300) return ANSI.yellow;
    return ANSI.green;
}

const requestLogger = morgan((tokens, req, res) => {
    const date = tokens.date(req, res, "iso") ?? "-";
    const method = (tokens.method(req, res) ?? "-").toUpperCase();
    const url = tokens.url(req, res) ?? "-";
    const statusRaw = tokens.status(req, res) ?? "0";
    const status = Number(statusRaw) || 0;
    const contentLength = tokens.res(req, res, "content-length") ?? "-";
    const responseTimeRaw = tokens["response-time"](req, res) ?? "0";
    const responseTime = Number(responseTimeRaw) || 0;

    return [
        colorize("[" + date + "]", ANSI.gray),
        colorize(method, methodColor(method)),
        url,
        colorize(String(status), statusColor(status)),
        contentLength,
        "-",
        `${colorize(responseTime.toFixed(1), responseTimeColor(responseTime))} ms`,
    ].join(" ");
});

export default requestLogger;
