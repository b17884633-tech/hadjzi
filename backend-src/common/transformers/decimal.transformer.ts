export const decimalTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | null): number | null =>
    value === null || value === undefined ? null : Number(value),
};
