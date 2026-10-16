import random
import unittest
from homunculus.brain import build_messages
from homunculus.config import Settings
from homunculus.simulation import Simulation
from homunculus.world import walkable

class DialogueContextTests(unittest.TestCase):
    def test_pre_message_snapshot_keeps_previous_user_turn(self):
        state = Simulation().snapshot()
        state['dialogue'] = [{'role':'user','content':'Previous thought 763'}]
        state['dialogue_before_trigger'] = True
        messages = build_messages(Settings(), state, 'The watcher says: New thought 291', random.Random(1))
        self.assertIn({'role':'user','content':'Previous thought 763'}, messages)
        self.assertEqual(messages[-1]['content'], 'New thought 291')

    def test_extreme_finite_drag_clamps_without_overflow(self):
        sim = Simulation()
        sim.interact('move', {'x':1e308, 'z':-1e308})
        self.assertTrue(walkable(*sim.position))

class AuthoredDialogueTests(unittest.TestCase):
    def test_room_questions_have_specific_replies(self):
        from homunculus.script import ScriptedMind
        mind = ScriptedMind(random.Random(2))
        for topic in ('book', 'wrapper', 'window'):
            with self.subTest(topic=topic):
                thought = mind.think(Settings(), Simulation().snapshot(), f'The watcher says: Tell me about the {topic}')
                self.assertIn(topic, thought['say'].lower())
