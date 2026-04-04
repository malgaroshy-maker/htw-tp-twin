import sys
import random
from dataclasses import dataclass

import pygame

# ----------------------------
# Simple Tray Packer Demo
# ----------------------------
# Controls:
#   SPACE  -> Start / Run Empty / Stop
#   R      -> Reset fault
#   P      -> Toggle product feed
#   B      -> Toggle downstream blocked
#   N      -> Toggle blank availability
#   1/2/3  -> Change recipe
#   ESC    -> Quit
#
# This is a BEHAVIORAL model, not an exact machine twin.
# It is meant to "behave like" a tray packer from the outside.


# ---------- Config ----------
WIDTH, HEIGHT = 1280, 720
FPS = 60

BG = (18, 22, 28)
PANEL = (28, 34, 42)
WHITE = (235, 235, 235)
GRAY = (150, 150, 150)
DARK_GRAY = (70, 70, 70)
GREEN = (60, 190, 90)
YELLOW = (240, 200, 70)
RED = (220, 70, 70)
BLUE = (70, 140, 240)
CYAN = (80, 220, 220)
ORANGE = (245, 155, 60)
PURPLE = (175, 110, 240)

INFEED_Y = 210
GROUP_X, GROUP_Y, GROUP_W, GROUP_H = 280, 145, 250, 140
BLANK_X_START = 560
PACK_ZONE_X, PACK_ZONE_Y, PACK_ZONE_W, PACK_ZONE_H = 630, 150, 220, 130
OUTFEED_Y = 215
REJECT_Y = 320
OUTLET_X = 1180

PRODUCT_RADIUS = 9


@dataclass
class Recipe:
    name: str
    logical_count: int
    grid_cols: int
    grid_rows: int
    cycle_time: float
    reject_prob: float
    jam_prob: float
    spawn_interval: float  # incoming product interval


class Product:
    def __init__(self, x: float, y: float):
        self.x = x
        self.y = y
        self.speed = 170.0

    def update(self, dt: float):
        self.x += self.speed * dt

    def draw(self, screen):
        pygame.draw.circle(screen, CYAN, (int(self.x), int(self.y)), PRODUCT_RADIUS)
        pygame.draw.circle(screen, WHITE, (int(self.x), int(self.y)), PRODUCT_RADIUS, 1)


class Pack:
    def __init__(self, x: float, y: float, rejected: bool = False):
        self.x = x
        self.y = y
        self.target_y = REJECT_Y if rejected else OUTFEED_Y
        self.rejected = rejected
        self.speed_x = 180.0
        self.speed_y = 220.0
        self.done = False

    def update(self, dt: float):
        # Move horizontally
        self.x += self.speed_x * dt

        # Smooth vertical move toward target lane
        if abs(self.y - self.target_y) > 2:
            direction = 1 if self.target_y > self.y else -1
            self.y += direction * self.speed_y * dt

        if self.x > OUTLET_X + 80:
            self.done = True

    def draw(self, screen):
        color = RED if self.rejected else GREEN
        rect = pygame.Rect(int(self.x), int(self.y - 24), 64, 48)
        pygame.draw.rect(screen, color, rect, border_radius=8)
        pygame.draw.rect(screen, WHITE, rect, 2, border_radius=8)

        # little flap lines
        pygame.draw.line(screen, WHITE, (rect.x + 20, rect.y), (rect.x + 20, rect.y + rect.h), 1)
        pygame.draw.line(screen, WHITE, (rect.x + 44, rect.y), (rect.x + 44, rect.y + rect.h), 1)


class TrayPackerSim:
    def __init__(self):
        self.recipes = {
            pygame.K_1: Recipe("24-pack", 24, 8, 3, 3.2, 0.05, 0.015, 0.09),
            pygame.K_2: Recipe("27-pack", 27, 9, 3, 3.6, 0.06, 0.020, 0.10),
            pygame.K_3: Recipe("30-pack", 30, 10, 3, 4.0, 0.08, 0.025, 0.11),
        }
        self.recipe = self.recipes[pygame.K_1]
        self.reset_all()

    def reset_all(self):
        self.state = "STOPPED"
        self.fault_text = ""
        self.grouped_count = 0
        self.loose_products = []
        self.packs = []
        self.product_feed_on = True
        self.blank_available = True
        self.downstream_free = True

        self.finished_packs = 0
        self.rejected_packs = 0
        self.cycles = 0
        self.runtime = 0.0
        self.downtime = 0.0

        self.spawn_timer = 0.0
        self.startup_timer = 0.0

        self.phase = "idle"     # idle, blank_in, packing, discharge
        self.phase_timer = 0.0
        self.pack_progress = 0.0
        self.blank_progress = 0.0
        self.pending_reject = False

        self.message = "Press SPACE to start"

    def set_recipe(self, recipe: Recipe):
        self.recipe = recipe
        self.grouped_count = min(self.grouped_count, self.recipe.logical_count)
        self.message = f"Recipe changed to {recipe.name}"

    def start_machine(self):
        if self.state in ("STOPPED", "STARVED", "BLOCKED"):
            if not self.blank_available:
                self.trigger_fault("Blank magazine empty")
                return
            self.state = "STARTING"
            self.startup_timer = 1.5
            self.message = "Machine starting..."

    def stop_machine(self):
        if self.state == "RUNNING":
            self.state = "RUN_EMPTY"
            self.message = "Run Empty requested"

    def reset_fault(self):
        if self.state == "FAULTED":
            self.fault_text = ""
            self.phase = "idle"
            self.phase_timer = 0.0
            self.blank_progress = 0.0
            self.pack_progress = 0.0
            self.pending_reject = False
            self.state = "STARTING"
            self.startup_timer = 1.0
            self.message = "Fault reset, restarting..."

    def trigger_fault(self, text: str):
        self.state = "FAULTED"
        self.fault_text = text
        self.message = text

    def current_state_color(self):
        return {
            "STOPPED": DARK_GRAY,
            "STARTING": BLUE,
            "RUNNING": GREEN,
            "STARVED": YELLOW,
            "BLOCKED": ORANGE,
            "FAULTED": RED,
            "RUN_EMPTY": PURPLE,
        }.get(self.state, WHITE)

    def handle_key(self, key):
        if key == pygame.K_SPACE:
            if self.state == "RUNNING":
                self.stop_machine()
            elif self.state in ("STOPPED", "STARVED", "BLOCKED"):
                self.start_machine()

        elif key == pygame.K_r:
            self.reset_fault()

        elif key == pygame.K_p:
            self.product_feed_on = not self.product_feed_on
            self.message = f"Product feed {'ON' if self.product_feed_on else 'OFF'}"
            if self.product_feed_on and self.state == "STARVED":
                self.start_machine()

        elif key == pygame.K_b:
            self.downstream_free = not self.downstream_free
            self.message = f"Downstream {'FREE' if self.downstream_free else 'BLOCKED'}"
            if self.downstream_free and self.state == "BLOCKED":
                self.start_machine()

        elif key == pygame.K_n:
            self.blank_available = not self.blank_available
            self.message = f"Blank supply {'AVAILABLE' if self.blank_available else 'EMPTY'}"

        elif key in self.recipes:
            self.set_recipe(self.recipes[key])

    def update(self, dt: float):
        # Runtime / downtime counters
        if self.state in ("RUNNING", "STARTING", "RUN_EMPTY"):
            self.runtime += dt
        else:
            self.downtime += dt

        # Update already created packs
        for pack in self.packs:
            pack.update(dt)
        self.packs = [p for p in self.packs if not p.done]

        # Update loose products
        for product in self.loose_products:
            product.update(dt)

        # Move products into grouping zone
        captured = []
        if self.phase == "idle" and self.state in ("RUNNING", "RUN_EMPTY"):
            for product in self.loose_products:
                if product.x >= GROUP_X + 25 and self.grouped_count < self.recipe.logical_count:
                    self.grouped_count += 1
                    captured.append(product)
        self.loose_products = [p for p in self.loose_products if p not in captured]

        # Starting delay
        if self.state == "STARTING":
            self.startup_timer -= dt
            if self.startup_timer <= 0:
                self.state = "RUNNING"
                self.message = "Machine running"

        # Starved / blocked recovery
        if self.state == "STARVED" and self.product_feed_on:
            self.start_machine()

        if self.state == "BLOCKED" and self.downstream_free:
            self.start_machine()

        # Product spawning
        if self.state in ("RUNNING", "STARTING"):
            if self.product_feed_on:
                self.spawn_timer += dt
                if self.spawn_timer >= self.recipe.spawn_interval:
                    self.spawn_timer = 0.0
                    spawn_y = INFEED_Y + random.choice([-10, 0, 10])
                    self.loose_products.append(Product(70, spawn_y))

        # Detect starved condition
        if self.state == "RUNNING" and self.phase == "idle":
            no_supply = (not self.product_feed_on) and len(self.loose_products) == 0 and self.grouped_count < self.recipe.logical_count
            if no_supply:
                self.state = "STARVED"
                self.message = "Starved: no incoming product"

        # Detect blocked condition
        if self.state == "RUNNING" and not self.downstream_free and self.phase == "idle":
            self.state = "BLOCKED"
            self.message = "Blocked: downstream conveyor full"

        # Begin cycle when grouped product is ready
        if self.state in ("RUNNING", "RUN_EMPTY") and self.phase == "idle":
            if self.grouped_count >= self.recipe.logical_count:
                if not self.blank_available:
                    self.trigger_fault("Blank missing")
                    return
                if not self.downstream_free:
                    self.state = "BLOCKED"
                    self.message = "Blocked before discharge"
                    return
                self.phase = "blank_in"
                self.phase_timer = 0.7
                self.blank_progress = 0.0
                self.message = "Blank feed"

        # Cycle phase logic
        if self.phase != "idle" and self.state not in ("FAULTED",):
            self.phase_timer -= dt

            if self.phase == "blank_in":
                self.blank_progress = min(1.0, self.blank_progress + dt / 0.7)
                if self.phase_timer <= 0:
                    self.phase = "packing"
                    self.phase_timer = self.recipe.cycle_time * 0.45
                    self.pack_progress = 0.0
                    self.message = "Packing cycle"

            elif self.phase == "packing":
                self.pack_progress = min(1.0, self.pack_progress + dt / max(0.1, self.recipe.cycle_time * 0.45))
                if self.phase_timer <= 0:
                    self.phase = "discharge"
                    self.phase_timer = self.recipe.cycle_time * 0.25

                    # Decide outcome of this cycle
                    jam_roll = random.random()
                    reject_roll = random.random()

                    if jam_roll < self.recipe.jam_prob:
                        self.trigger_fault("Gap control jam")
                        return

                    self.pending_reject = reject_roll < self.recipe.reject_prob
                    self.packs.append(Pack(PACK_ZONE_X + 30, PACK_ZONE_Y + 35, rejected=self.pending_reject))
                    self.grouped_count = 0
                    self.cycles += 1

                    if self.pending_reject:
                        self.rejected_packs += 1
                    else:
                        self.finished_packs += 1

                    self.message = "Discharge"

            elif self.phase == "discharge":
                if self.phase_timer <= 0:
                    self.phase = "idle"
                    self.pending_reject = False
                    self.blank_progress = 0.0
                    self.pack_progress = 0.0

                    # If run empty requested, stop after clearing grouped and loose product
                    if self.state == "RUN_EMPTY":
                        if self.grouped_count == 0 and len(self.loose_products) == 0:
                            self.state = "STOPPED"
                            self.message = "Stopped after Run Empty"

        # Clean products that move too far
        self.loose_products = [p for p in self.loose_products if p.x < WIDTH + 50]

    def draw_conveyors(self, screen):
        # Infeed conveyor
        pygame.draw.rect(screen, DARK_GRAY, (50, INFEED_Y - 18, 260, 36), border_radius=10)
        pygame.draw.rect(screen, WHITE, (50, INFEED_Y - 18, 260, 36), 2, border_radius=10)

        # Grouping zone
        pygame.draw.rect(screen, (45, 60, 70), (GROUP_X, GROUP_Y, GROUP_W, GROUP_H), border_radius=12)
        pygame.draw.rect(screen, WHITE, (GROUP_X, GROUP_Y, GROUP_W, GROUP_H), 2, border_radius=12)

        # Pack zone
        pygame.draw.rect(screen, (55, 50, 65), (PACK_ZONE_X, PACK_ZONE_Y, PACK_ZONE_W, PACK_ZONE_H), border_radius=12)
        pygame.draw.rect(screen, WHITE, (PACK_ZONE_X, PACK_ZONE_Y, PACK_ZONE_W, PACK_ZONE_H), 2, border_radius=12)

        # Outfeed conveyor
        pygame.draw.rect(screen, DARK_GRAY, (860, OUTFEED_Y - 18, 300, 36), border_radius=10)
        pygame.draw.rect(screen, WHITE, (860, OUTFEED_Y - 18, 300, 36), 2, border_radius=10)

        # Reject lane
        pygame.draw.rect(screen, (80, 40, 40), (860, REJECT_Y - 18, 300, 36), border_radius=10)
        pygame.draw.rect(screen, WHITE, (860, REJECT_Y - 18, 300, 36), 2, border_radius=10)

        # Blank magazine
        mag_rect = pygame.Rect(540, 430, 90, 120)
        pygame.draw.rect(screen, (70, 70, 90), mag_rect, border_radius=10)
        pygame.draw.rect(screen, WHITE, mag_rect, 2, border_radius=10)
        for i in range(5):
            pygame.draw.rect(screen, (180, 180, 200), (550, 530 - i * 12, 55, 8), border_radius=3)

    def draw_grouped_products(self, screen, font):
        label = font.render("Grouping", True, WHITE)
        screen.blit(label, (GROUP_X + 8, GROUP_Y - 28))

        count_text = font.render(f"{self.grouped_count} / {self.recipe.logical_count}", True, WHITE)
        screen.blit(count_text, (GROUP_X + GROUP_W - 120, GROUP_Y - 28))

        max_draw = self.recipe.logical_count
        padding_x = 18
        padding_y = 24
        cell_w = (GROUP_W - 2 * padding_x) / self.recipe.grid_cols
        cell_h = (GROUP_H - 2 * padding_y) / self.recipe.grid_rows

        for i in range(min(self.grouped_count, max_draw)):
            row = i // self.recipe.grid_cols
            col = i % self.recipe.grid_cols
            x = GROUP_X + padding_x + col * cell_w + cell_w * 0.5
            y = GROUP_Y + padding_y + row * cell_h + cell_h * 0.5
            pygame.draw.circle(screen, CYAN, (int(x), int(y)), 7)
            pygame.draw.circle(screen, WHITE, (int(x), int(y)), 7, 1)

    def draw_blank(self, screen, font):
        label = font.render("Blank feed", True, WHITE)
        screen.blit(label, (540, 395))

        # magazine status
        status_color = GREEN if self.blank_available else RED
        pygame.draw.circle(screen, status_color, (620, 450), 8)

        if self.phase in ("blank_in", "packing", "discharge"):
            start_x = BLANK_X_START
            target_x = PACK_ZONE_X + 30
            x = start_x + (target_x - start_x) * self.blank_progress
            y = 250
            rect = pygame.Rect(int(x), int(y), 90, 55)
            pygame.draw.rect(screen, (210, 210, 220), rect, border_radius=6)
            pygame.draw.rect(screen, DARK_GRAY, rect, 2, border_radius=6)

    def draw_pack_zone(self, screen, font):
        label = font.render("Pack zone", True, WHITE)
        screen.blit(label, (PACK_ZONE_X + 8, PACK_ZONE_Y - 28))

        if self.phase == "packing":
            glow = int(80 + 120 * self.pack_progress)
            color = (glow, 120, 220)
            rect = pygame.Rect(PACK_ZONE_X + 25, PACK_ZONE_Y + 20, 120, 70)
            pygame.draw.rect(screen, color, rect, border_radius=10)
            pygame.draw.rect(screen, WHITE, rect, 2, border_radius=10)

    def draw_products(self, screen):
        for product in self.loose_products:
            product.draw(screen)

    def draw_packs(self, screen):
        for pack in self.packs:
            pack.draw(screen)

    def draw_info_panel(self, screen, font, big_font):
        panel = pygame.Rect(20, 580, WIDTH - 40, 120)
        pygame.draw.rect(screen, PANEL, panel, border_radius=14)
        pygame.draw.rect(screen, WHITE, panel, 2, border_radius=14)

        # State box
        state_color = self.current_state_color()
        pygame.draw.rect(screen, state_color, (35, 595, 170, 90), border_radius=12)
        pygame.draw.rect(screen, WHITE, (35, 595, 170, 90), 2, border_radius=12)

        state_text = big_font.render(self.state, True, WHITE)
        screen.blit(state_text, (50, 625))

        # Metrics
        x0 = 235
        lines = [
            f"Recipe: {self.recipe.name}",
            f"Cycles: {self.cycles}",
            f"Good packs: {self.finished_packs}",
            f"Rejected: {self.rejected_packs}",
            f"Runtime: {self.runtime:0.1f}s",
            f"Downtime: {self.downtime:0.1f}s",
            f"Feed: {'ON' if self.product_feed_on else 'OFF'}",
            f"Blank: {'OK' if self.blank_available else 'EMPTY'}",
            f"Downstream: {'FREE' if self.downstream_free else 'BLOCKED'}",
        ]

        for i, txt in enumerate(lines[:5]):
            screen.blit(font.render(txt, True, WHITE), (x0, 600 + i * 18))
        for i, txt in enumerate(lines[5:]):
            screen.blit(font.render(txt, True, WHITE), (x0 + 230, 600 + i * 18))

        # Message / fault
        msg_color = RED if self.state == "FAULTED" else WHITE
        message = self.fault_text if self.state == "FAULTED" else self.message
        screen.blit(big_font.render(message, True, msg_color), (720, 620))

    def draw_labels(self, screen, font):
        screen.blit(font.render("Infeed", True, WHITE), (60, 170))
        screen.blit(font.render("Outfeed", True, WHITE), (870, 175))
        screen.blit(font.render("Reject", True, WHITE), (870, 280))

        controls = "SPACE Start/Stop | R Reset | P Product feed | B Downstream block | N Blank empty | 1/2/3 Recipe"
        screen.blit(font.render(controls, True, GRAY), (20, 20))

    def draw(self, screen, font, big_font):
        screen.fill(BG)
        self.draw_labels(screen, font)
        self.draw_conveyors(screen)
        self.draw_products(screen)
        self.draw_grouped_products(screen, font)
        self.draw_blank(screen, font)
        self.draw_pack_zone(screen, font)
        self.draw_packs(screen)
        self.draw_info_panel(screen, font, big_font)


def main():
    pygame.init()
    pygame.display.set_caption("Tray Packer - Simple Behavioral Demo")
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    clock = pygame.time.Clock()

    font = pygame.font.SysFont("consolas", 20)
    big_font = pygame.font.SysFont("consolas", 28, bold=True)

    sim = TrayPackerSim()

    while True:
        dt = clock.tick(FPS) / 1000.0

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()

            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    pygame.quit()
                    sys.exit()
                sim.handle_key(event.key)

        sim.update(dt)
        sim.draw(screen, font, big_font)
        pygame.display.flip()


if __name__ == "__main__":
    main()
