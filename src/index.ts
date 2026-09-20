import { commander } from '@commander.js';

try {
    await commander.run();
} catch (err) {
    console.error(err);
}