/**
 * Column spans on the sheet's six-column field grid, sized to what each box holds. Phones get one
 * box per row, except the short register numbers (sixth), which share a row.
 */
export const span = {
  full: "col-span-6",
  half: "col-span-6 @min-[36rem]:col-span-3",
  third: "col-span-6 @min-[36rem]:col-span-2",
  twoThirds: "col-span-6 @min-[36rem]:col-span-4",
  sixth: "col-span-2 @min-[36rem]:col-span-1",
} as const;
