import { nanoid } from 'nanoid';

export const newId = (prefix) => `${prefix}_${nanoid(12)}`;
