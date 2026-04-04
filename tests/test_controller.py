from app.shared.tag_store import TagStore
from app.control.controller import PLCStyleController


def test_controller_blocks_recipe_change_while_not_stopped():
    tags = TagStore()
    tags.state.sts["machine_state"] = "RUNNING"
    controller = PLCStyleController(tags)
    controller.update() # Set HMI flags
    assert controller.select_recipe("30-pack") is False


def test_controller_allows_start_when_permissive_ok():
    tags = TagStore()
    controller = PLCStyleController(tags)
    controller.update() # Set HMI flags
    assert controller.request_start() is True
