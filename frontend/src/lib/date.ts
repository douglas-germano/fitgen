import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Timezone do Brasil (Brasília)
 */
const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

/**
 * Converte data UTC para BRT e formata
 * @param date - Data em UTC (string ISO ou Date object)
 * @param formatStr - Formato desejado (padrão: 'dd/MM/yyyy HH:mm')
 * @returns Data formatada em BRT
 */
export function formatDateBRT(
    date: string | Date | null | undefined,
    formatStr: string = 'dd/MM/yyyy HH:mm'
): string {
    if (!date) return '-';

    try {
        const dateObj = typeof date === 'string' ? parseISO(date) : date;

        // Converter para BRT usando Intl API
        const brtDate = new Date(
            dateObj.toLocaleString('en-US', { timeZone: BRAZIL_TIMEZONE })
        );

        return format(brtDate, formatStr, { locale: ptBR });
    } catch (error) {
        console.error('Error formatting date:', error);
        return '-';
    }
}

/**
 * Formata data como "há X minutos/horas/dias"
 * @param date - Data em UTC (string ISO ou Date object)
 * @returns Texto relativo em português
 */
export function formatRelativeBRT(date: string | Date | null | undefined): string {
    if (!date) return '-';

    try {
        const dateObj = typeof date === 'string' ? parseISO(date) : date;

        return formatDistanceToNow(dateObj, {
            addSuffix: true,
            locale: ptBR
        });
    } catch (error) {
        console.error('Error formatting relative date:', error);
        return '-';
    }
}

/**
 * Formata apenas a data (sem hora)
 * @param date - Data em UTC
 * @returns Data formatada como "DD/MM/YYYY"
 */
export function formatDateOnlyBRT(date: string | Date | null | undefined): string {
    return formatDateBRT(date, 'dd/MM/yyyy');
}

/**
 * Formata apenas a hora
 * @param date - Data em UTC
 * @returns Hora formatada como "HH:mm"
 */
export function formatTimeOnlyBRT(date: string | Date | null | undefined): string {
    return formatDateBRT(date, 'HH:mm');
}

/**
 * Formata data completa por extenso
 * @param date - Data em UTC
 * @returns Data como "14 de dezembro de 2025 às 16:30"
 */
export function formatDateLongBRT(date: string | Date | null | undefined): string {
    return formatDateBRT(date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm");
}

/**
 * Obtém a hora atual em BRT
 * @returns Date object com hora de Brasília
 */
export function getNowBRT(): Date {
    return new Date(
        new Date().toLocaleString('en-US', { timeZone: BRAZIL_TIMEZONE })
    );
}

/**
 * Verifica se uma data está no passado (em BRT)
 */
export function isPastBRT(date: string | Date | null | undefined): boolean {
    if (!date) return false;
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return dateObj < getNowBRT();
}
