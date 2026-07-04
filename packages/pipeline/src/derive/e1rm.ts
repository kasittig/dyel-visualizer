export const calcE1RM = (w: number, r: number) => (r <= 1 ? w : w * (1 + r / 30));

export const invertE1RM = (e1rm: number, r: number) => (r === 1 ? e1rm : e1rm / (1 + r / 30));
