-- Update category icons from emojis to icon names

UPDATE categories SET icon = 'groceries' WHERE icon = '🛒';
UPDATE categories SET icon = 'dining' WHERE icon = '🍽️';
UPDATE categories SET icon = 'transport' WHERE icon = '🚗';
UPDATE categories SET icon = 'utilities' WHERE icon = '💡';
UPDATE categories SET icon = 'entertainment' WHERE icon = '🎬';
UPDATE categories SET icon = 'shopping' WHERE icon = '🛍️';
UPDATE categories SET icon = 'healthcare' WHERE icon = '🏥';
UPDATE categories SET icon = 'income' WHERE icon = '💰';
UPDATE categories SET icon = 'other' WHERE icon = '📌';

-- Also update the default values in the schema definition if possible, 
-- but since this is a migration on existing data, the above updates are key.
