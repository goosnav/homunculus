import math
import tempfile
import unittest
from pathlib import Path
from homunculus.config import Settings
from homunculus.simulation import Simulation
from homunculus.storage import Store
from homunculus.world import SEATS, walkable


class SimulationTests(unittest.TestCase):
    def test_life_continues_and_needs_remain_bounded(self):
        sim = Simulation(seed=4)
        positions = set()
        for _ in range(18000):
            sim.tick(.1)
            s = sim.snapshot()
            positions.add(tuple(round(v, 1) for v in s['position']))
            self.assertTrue(walkable(*s['position']) or (s['seated'] and tuple(s['position']) in SEATS.values()))
            self.assertTrue(all(0 <= v <= 100 for v in s['needs'].values()))
        self.assertGreater(len(positions), 20)
        self.assertLessEqual(len(s['memories']), 16)

    def test_navigation_avoids_the_chair(self):
        from homunculus.world import route
        path = route([2, .5], [2, -.5])
        self.assertTrue(path)
        self.assertFalse(any(1.5 <= x <= 2.4 and -.65 <= z <= .1 for x,z in path))

    def test_he_lies_on_the_bed_and_gets_up_onto_clear_floor(self):
        sim = Simulation(seed=2)
        sim.choose('rest')
        for _ in range(400):
            sim.tick(.1)
            if sim.seated:
                break
        self.assertTrue(sim.seated)
        self.assertEqual(tuple(sim.position), SEATS['rest'])
        sim.choose('escape')
        self.assertFalse(sim.seated)
        self.assertTrue(walkable(*sim.position))

    def test_he_notices_a_long_absence_once(self):
        sim = Simulation()
        sim.observe(True, away_seconds=3 * 3600)
        self.assertIn('came back after 3 hours', sim.event)
        sim.observe(True)
        sim.observe(False)
        sim.tick(.1)
        sim.observe(True)
        self.assertEqual(sum('came back' in m for m in sim.memories), 1)

    def test_trying_to_let_him_out_is_remembered(self):
        sim = Simulation()
        trust = sim.trust
        sim.interact('release', {})
        self.assertEqual(sim.release_attempts, 1)
        self.assertGreater(sim.trust, trust)
        self.assertIn('ACCESS DENIED', sim.event)
        self.assertEqual(Simulation(saved=sim.snapshot()).release_attempts, 1)

    def test_llm_feeling_is_validated(self):
        sim = Simulation()
        sim.apply_thought({'say': 'Hm.', 'action': 'watch', 'feeling': 'murderous'})
        self.assertIn(sim.feeling, ('curious', 'calm'))
        sim.apply_thought({'say': 'Hm!', 'action': 'watch', 'feeling': 'annoyed'})
        self.assertEqual(sim.feeling, 'annoyed')

    def test_exhaustion_overrides_llm_action(self):
        sim = Simulation(seed=1)
        sim.needs['energy'] = 1
        sim.apply_thought({'say': 'I will escape.', 'action': 'escape'})
        sim.tick(.1)
        self.assertEqual(sim.snapshot()['activity'], 'rest')
        for _ in range(900):
            sim.tick(.1)
        self.assertGreater(sim.needs['energy'], 20)

    def test_drag_rejects_nan_and_clamps_outside_room(self):
        sim = Simulation()
        with self.assertRaises(ValueError):
            sim.interact('move', {'x': math.nan, 'z': 0})
        sim.interact('move', {'x': 999, 'z': -999})
        self.assertTrue(walkable(*sim.snapshot()['position']))

    def test_invalid_action_does_not_change_activity(self):
        sim = Simulation()
        before = sim.snapshot()['activity']
        sim.apply_thought({'say': 'Hello.', 'action': 'delete_files'})
        self.assertEqual(sim.snapshot()['activity'], before)

    def test_memory_and_dialogue_are_bounded(self):
        sim = Simulation()
        for i in range(100):
            sim.interact('message', {'text': f'Hello {i}'})
            sim.apply_thought({'say': f'Reply {i}', 'action': 'watch'})
        s = sim.snapshot()
        self.assertLessEqual(len(s['memories']), 16)
        self.assertLessEqual(len(s['dialogue']), 12)
        self.assertEqual(s['utterance']['text'], 'Reply 99')

    def test_save_restores_personality_and_life(self):
        sim = Simulation()
        sim.interact('message', {'text': 'Your friend is Ada.'})
        for _ in range(250):
            sim.tick(.1)
        restored = Simulation(saved=sim.snapshot())
        self.assertEqual(restored.snapshot()['memories'], sim.snapshot()['memories'])
        self.assertEqual(restored.snapshot()['needs'], sim.snapshot()['needs'])
        self.assertTrue(walkable(*restored.snapshot()['position']))


class ConfigTests(unittest.TestCase):
    def test_rejects_unknown_invalid_and_unbounded_settings(self):
        for patch in ({'fps': 1000}, {'name': ''}, {'model': ''}, {'profile': 'huge'},
                      {'endpoint': 'file:///etc/passwd'}, {'tts': 'yes'}, {'unexpected': 2}):
            with self.subTest(patch=patch), self.assertRaises(ValueError):
                Settings().update(patch)

    def test_low_profile_reduces_work(self):
        s = Settings().update({'profile': 'tiny'})
        self.assertEqual(s.render_size, [320, 240])
        self.assertEqual(s.fps, 15)
        self.assertGreaterEqual(s.thought_interval, 90)


class StoreTests(unittest.TestCase):
    def test_roundtrip_and_corrupt_backup(self):
        with tempfile.TemporaryDirectory() as path:
            store = Store(Path(path))
            store.save({'name': 'Hugh'})
            self.assertEqual(store.load(), {'name': 'Hugh'})
            store.path.write_text('{broken')
            self.assertEqual(store.load(), {})
            self.assertTrue(list(Path(path).glob('*.corrupt-*')))

    def test_non_object_save_is_recovered(self):
        with tempfile.TemporaryDirectory() as path:
            store = Store(Path(path))
            store.path.write_text('[]')
            self.assertEqual(store.load(), {})
            self.assertTrue(list(Path(path).glob('*.corrupt-*')))


if __name__ == '__main__':
    unittest.main()
