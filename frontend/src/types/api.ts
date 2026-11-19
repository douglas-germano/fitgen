export interface APIError extends Error {
    status: number;
    msg?: string;
    message: string;
    error?: string;
}
