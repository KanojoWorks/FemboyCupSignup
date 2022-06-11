export function calculateBws(rank: number, badges: number): number {
    const badgeResult: number = Math.pow(badges, 2)
    const x: number = Math.pow(0.9937, badgeResult)
    const bws: number = Math.round(Math.pow(rank, x))
    return bws
}
