//! Browser host: upstream DynamicsWorld + steering/camera kernels, original park/controller.
use skate_core::{
    camera::{ScalarTracker, ScalarTrackerParameters},
    point_graph::PointGraph,
    riding::steering::{self, SteeringInput, SteeringSettings},
};
use skate_dynamics::{BodyDesc, BodyType, DynamicsWorld, Shape};
use std::cell::RefCell;
const DT: f32 = 1.0 / 120.0;
const RADIUS: f32 = 0.24;
struct Game {
    world: DynamicsWorld,
    player: u64,
    yaw: f32,
    turn: f32,
    push_scalar: f32,
    grounded: bool,
    airborne: f32,
    jump_lock: f32,
    trick: u32,
    trick_time: f32,
    score: f32,
    last: u32,
    event: u32,
    normal: [f32; 3],
    camera: [ScalarTracker; 3],
    output: [f32; 24],
}
fn tracker(position: f32) -> ScalarTracker {
    ScalarTracker {
        target: position,
        position,
        velocity: 0.,
        acceleration: 0.,
        acceleration_clamp: 100.,
        smoothing: 0.,
    }
}
fn graph(a: f32, b: f32) -> PointGraph<8> {
    PointGraph {
        x: [0., 0.14, 0.28, 0.42, 0.57, 0.71, 0.85, 1.],
        y: std::array::from_fn(|i| a + (b - a) * i as f32 / 7.),
    }
}
impl Game {
    fn new() -> Self {
        let mut world = DynamicsWorld::default();
        let player = world
            .spawn(BodyDesc {
                shape: Shape::Sphere { radius: RADIUS },
                body_type: BodyType::Dynamic,
                mass: 75.,
                position: [0., 1., -12.],
                friction: 0.,
                ccd: true,
                linear_damping: 0.,
                angular_damping: 10.,
                ..Default::default()
            })
            .unwrap();
        Self {
            world,
            player,
            yaw: 0.,
            turn: 0.,
            push_scalar: 1.,
            grounded: false,
            airborne: 0.,
            jump_lock: 0.,
            trick: 0,
            trick_time: 0.,
            score: 0.,
            last: 0,
            event: 0,
            normal: [0., 1., 0.],
            camera: [tracker(0.), tracker(3.), tracker(-18.)],
            output: [0.; 24],
        }
    }
    fn reset(&mut self) {
        self.world
            .set_pose(self.player, [0., 1., -12.], [0., 0., 0., 1.]);
        self.world.set_linvel(self.player, [0.; 3]);
        self.world.set_angvel(self.player, [0.; 3]);
        self.yaw = 0.;
        self.turn = 0.;
        self.grounded = false;
        self.trick = 0;
        self.airborne = 0.;
        self.jump_lock = 0.2;
        self.last = 0;
        self.event += 1;
        self.camera = [tracker(0.), tracker(3.), tracker(-18.)];
    }
    fn step(&mut self, push: f32, turn: f32, brake: f32, jump: bool, trick: u32) {
        let state = self.world.read(self.player).unwrap();
        let p = state.position;
        let mut v = state.linvel;
        let hit = self
            .world
            .raycast_excluding(p, [0., -1., 0.], 0.40, Some(self.player));
        let contact = hit.filter(|h| h.toi < RADIUS + 0.085 && h.normal[1] > 0.25);
        self.jump_lock = (self.jump_lock - DT).max(0.);
        let was = self.grounded;
        self.grounded = contact.is_some() && self.jump_lock <= 0.;
        self.normal = contact.map_or([0., 1., 0.], |h| h.normal);
        let speed = (v[0] * v[0] + v[2] * v[2]).sqrt();
        let settings = SteeringSettings {
            hard_turn_increase: 0.3,
            damping: 0.12,
            speed_graph_max_speed: 14.,
            push_scalar_increment: 0.02,
            push_scalar_decrement: 0.01,
            push_scalar_min: 0.8,
            manual_scalar: 1.,
            general_scalar: 1.,
            tight_trucks_scalar: 0.5,
            speed_graph: graph(1., 0.5),
            input_graph: graph(1., 1.),
            tilt_blending: 0.1,
        };
        let tilt = steering::calculate_tilt(
            &settings,
            SteeringInput {
                turn: turn.clamp(-1., 1.),
                absolute_body_speed: speed,
                flipped_controls_scalar: 1.,
                pushing: push > 0.,
                ..Default::default()
            },
            Some(&mut self.push_scalar),
            Some(&mut self.turn),
        );
        self.yaw += tilt
            * DT
            * if self.grounded {
                1.8 + speed * 0.045
            } else {
                1.8
            };
        if self.grounded {
            let forward = [self.yaw.sin(), self.yaw.cos()];
            let along = v[0] * forward[0] + v[2] * forward[1];
            let target = (along + push.clamp(0., 1.) * 7.5 * DT
                - (0.12 + brake.clamp(0., 1.) * 13.) * DT)
                .clamp(0., 15.);
            let grip = 1.0 - (-14. * DT).exp();
            v[0] = forward[0] * target + (v[0] - forward[0] * along) * (1. - grip);
            v[2] = forward[1] * target + (v[2] - forward[1] * along) * (1. - grip);
            // Project drive onto the contacted slope; Rapier supplies gravity/collision impulses.
            v[1] = -(self.normal[0] * v[0] + self.normal[2] * v[2]) / self.normal[1];
            if jump {
                v[1] += 5.5;
                self.grounded = false;
                self.jump_lock = 0.16;
                self.airborne = 0.;
                self.trick = 1;
                self.trick_time = 0.;
            }
        }
        if !self.grounded {
            self.airborne += DT;
            if trick > 0 && self.trick <= 1 {
                self.trick = trick + 1;
                self.trick_time = 0.;
            }
            self.trick_time += DT;
        }
        if self.grounded && !was && self.airborne > 0.12 && self.trick > 0 {
            let complete = self.trick <= 1 || self.trick_time > 0.42;
            self.last = if complete { self.trick.max(1) } else { 5 };
            if complete {
                self.score += match self.last {
                    2 => 250.,
                    3 => 300.,
                    4 => 180.,
                    _ => 100.,
                };
            }
            self.event += 1;
            self.trick = 0;
            self.trick_time = 0.;
            self.airborne = 0.;
        }
        self.world.set_linvel(self.player, v);
        self.world.set_angvel(self.player, [0.; 3]);
        self.world.step(DT);
        let s = self.world.read(self.player).unwrap();
        if s.position[1] < -8. || s.position[0].abs() > 70. || s.position[2].abs() > 70. {
            self.reset();
        }
        let s = self.world.read(self.player).unwrap();
        let desired = [
            s.position[0] - self.yaw.sin() * 6.,
            s.position[1] + 3.,
            s.position[2] - self.yaw.cos() * 6.,
        ];
        let params = ScalarTrackerParameters {
            delta_umbra: 0.2,
            delta_penumbra: 8.,
            speed_clamp: 40.,
            acceleration_clamp_min: 50.,
            acceleration_clamp_max: 100.,
            smoothing_min: 0.05,
            smoothing_max: 0.12,
            overshoot_zeroes_velocity: true,
        };
        for i in 0..3 {
            self.camera[i].update(DT, desired[i], params);
        }
        self.output = [
            s.position[0],
            s.position[1] - RADIUS + 0.16,
            s.position[2],
            self.yaw,
            speed,
            if self.grounded { 1. } else { 0. },
            self.trick as f32,
            self.trick_time,
            self.score,
            self.last as f32,
            self.event as f32,
            self.turn,
            self.normal[0],
            self.normal[1],
            self.normal[2],
            self.camera[0].position,
            self.camera[1].position,
            self.camera[2].position,
            s.linvel[1],
            self.airborne,
            0.,
            0.,
            0.,
            0.,
        ];
    }
}
thread_local! {static GAME: RefCell<Game> = RefCell::new(Game::new());}
#[unsafe(no_mangle)]
pub extern "C" fn init() {
    GAME.with(|g| *g.borrow_mut() = Game::new());
}
#[unsafe(no_mangle)]
pub extern "C" fn reset() {
    GAME.with(|g| g.borrow_mut().reset());
}
#[unsafe(no_mangle)]
pub extern "C" fn add_box(x: f32, y: f32, z: f32, hx: f32, hy: f32, hz: f32) {
    GAME.with(|g| {
        g.borrow_mut()
            .world
            .spawn(BodyDesc {
                shape: Shape::Box {
                    half_extents: [hx, hy, hz],
                },
                body_type: BodyType::Static,
                position: [x, y, z],
                friction: 0.,
                ..Default::default()
            })
            .unwrap();
    });
}
#[unsafe(no_mangle)]
pub extern "C" fn add_ramp(x: f32, z: f32, width: f32, length: f32, height: f32, reverse: u32) {
    let dir = if reverse == 0 { 1. } else { -1. };
    let points = vec![
        [-width / 2., -0.3, -length / 2.],
        [width / 2., -0.3, -length / 2.],
        [-width / 2., -0.3, length / 2.],
        [width / 2., -0.3, length / 2.],
        [-width / 2., height, dir * length / 2.],
        [width / 2., height, dir * length / 2.],
        [-width / 2., 0., -dir * length / 2.],
        [width / 2., 0., -dir * length / 2.],
    ];
    GAME.with(|g| {
        g.borrow_mut()
            .world
            .spawn(BodyDesc {
                shape: Shape::Convex { points },
                body_type: BodyType::Static,
                position: [x, 0., z],
                friction: 0.,
                ..Default::default()
            })
            .unwrap();
    });
}
#[unsafe(no_mangle)]
pub extern "C" fn tick(push: f32, turn: f32, brake: f32, jump: u32, trick: u32) {
    GAME.with(|g| g.borrow_mut().step(push, turn, brake, jump != 0, trick));
}
#[unsafe(no_mangle)]
pub extern "C" fn state_ptr() -> *const f32 {
    GAME.with(|g| g.borrow().output.as_ptr())
}

#[cfg(test)]
mod tests {
    use super::*;
    fn game() -> Game {
        let mut g = Game::new();
        g.world
            .spawn(BodyDesc {
                shape: Shape::Box {
                    half_extents: [50., 0.5, 50.],
                },
                body_type: BodyType::Static,
                position: [0., -0.5, 0.],
                friction: 0.,
                ..Default::default()
            })
            .unwrap();
        for _ in 0..120 {
            g.step(0., 0., 0., false, 0);
        }
        g
    }
    #[test]
    fn settle_push_jump_land_score() {
        let mut g = game();
        assert!(g.grounded);
        let z = g.output[2];
        for _ in 0..360 {
            g.step(1., 0., 0., false, 0);
        }
        assert!(g.output[2] > z + 5.);
        g.step(0., 0., 0., true, 0);
        assert!(!g.grounded);
        let y = g.output[1];
        for _ in 0..25 {
            g.step(0., 0., 0., false, 1);
        }
        assert!(g.output[1] > y + 0.2);
        for _ in 0..180 {
            g.step(0., 0., 0., false, 0);
        }
        assert!(g.grounded);
        assert!(g.score >= 250.);
    }
    #[test]
    fn brake_turn_reset() {
        let mut g = game();
        for _ in 0..300 {
            g.step(1., 0., 0., false, 0);
        }
        let speed = g.output[4];
        for _ in 0..120 {
            g.step(0., 0.5, 1., false, 0);
        }
        assert!(g.output[4] < speed);
        assert!(g.yaw > 0.1);
        g.reset();
        assert_eq!(g.yaw, 0.);
        assert_eq!(g.world.read(g.player).unwrap().position, [0., 1., -12.]);
    }
}
