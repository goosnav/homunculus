import math
import tempfile
import unittest
from pathlib import Path
from homunculus.config import Settings
from homunculus.simulation import Simulation
from homunculus.storage import Store
from homunculus.world import walkable


class SimulationTests(unittest.TestCase):
    def test_life_continues_and_needs_remain_bounded(self):
        sim = Simulation(seed=4)
        positions = set()
        for _ in range(18000):
            sim.tick(.1)
            s = sim.snapshot()
            positions.add(tuple(round(v, 1) for v in s['position']))
            self.assertTrue(walkable(*s['position']))
            self.assertTrue(all(0 <= v <= 100 for v in s['needs'].values()))
        self.assertGreater(len(positions), 20)
        self.assertLessEqual(len(s['memories']), 16)

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
