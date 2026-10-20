import unittest
from homunculus.simulation import Simulation

class DailyLifeTests(unittest.TestCase):
    def test_walking_toward_book_does_not_mean_he_has_read_it(self):
        sim = Simulation(seed=1)
        sim.choose('read')
        self.assertNotIn('book', [j['key'] for j in sim.journal])
        sim.interact('tap', {})
        self.assertNotIn('book', [j['key'] for j in sim.journal])
        sim.choose('read')
        for _ in range(600):
            sim.tick(.1)
            if any(j['key']=='book' for j in sim.journal):
                break
        self.assertTrue(sim.seated)
        entry = next(j for j in sim.snapshot()['journal'] if j['key']=='book')
        self.assertIn('panel', entry['text'])
        self.assertEqual(entry['title'], 'The book')

    def test_restored_notes_keep_their_words(self):
        sim = Simulation()
        sim.interact('tap', {})
        self.assertEqual(Simulation(saved=sim.snapshot()).snapshot()['journal'], sim.snapshot()['journal'])
        self.assertIn('knocked', sim.snapshot()['journal'][0]['text'])
