function cleanName(value) {
  return String(value ?? '').trim();
}

export function normalizeOptionGroups(groups = []) {
  return (Array.isArray(groups) ? groups : []).map((group) => ({
    name: cleanName(group.name),
    required: Boolean(group.required),
    options: (Array.isArray(group.options) ? group.options : []).map((option) => ({
      name: cleanName(option.name),
      price: Number(option.price || 0),
    })),
  })).filter((group) => group.name || group.options.length);
}

export function validateOptionGroups(groups = []) {
  const normalized = normalizeOptionGroups(groups);
  const names = new Set();
  for (const group of normalized) {
    if (!group.name) return 'Option group name is required.';
    const groupKey = group.name.toLowerCase();
    if (names.has(groupKey)) return 'Option group names must be unique.';
    names.add(groupKey);
    if (!group.options.length) return `Option group "${group.name}" must contain at least one option.`;
    const optionNames = new Set();
    for (const option of group.options) {
      if (!option.name) return 'Option name is required.';
      if (optionNames.has(option.name.toLowerCase())) return 'Option names must be unique within each group.';
      optionNames.add(option.name.toLowerCase());
      if (!Number.isFinite(option.price) || option.price < 0) return 'Option price adjustment must be 0 or greater.';
    }
  }
  return '';
}

export function calculateOptionPrice(product, selectedOptions = {}) {
  const groups = normalizeOptionGroups(product?.optionGroups);
  const selections = [];
  let price = Number(product?.price || 0);
  for (const group of groups) {
    const selectedName = selectedOptions[group.name];
    if (!selectedName) {
      if (group.required) throw new Error(`Please select ${group.name}.`);
      continue;
    }
    const option = group.options.find((item) => item.name === selectedName);
    if (!option) throw new Error(`Invalid selection for ${group.name}.`);
    price += option.price;
    selections.push({ group: group.name, option: option.name, priceAdjustment: option.price });
  }
  return { price: Math.round((price + Number.EPSILON) * 100) / 100, selections };
}
