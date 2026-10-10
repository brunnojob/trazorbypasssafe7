export const money = (minor: number, currency: string) => {
  if (!Number.isSafeInteger(minor) || !/^[A-Z]{3}$/.test(currency)) throw new Error("Invalid monetary amount or currency.");
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(
    minor / 100,
  );
};
export function parseMinor(value: string) {
  if (!/^\d{1,10}(?:[.,]\d{1,2})?$/.test(value))
    throw new Error("Informe um valor positivo com até duas casas decimais.");
  const [whole, fraction = ""] = value.replace(",", ".").split(".");
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(minor) || minor < 1 || minor > 1000000000000)
    throw new Error("Valor fora do limite.");
  return minor;
}

