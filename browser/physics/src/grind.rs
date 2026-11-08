//! Arcade rail admission and constraint; independent of render/character assets.
#[derive(Clone, Copy)]
pub struct Rail {
    pub a: [f32; 3],
    pub length: f32,
    pub tangent: [f32; 3],
}
impl Rail {
    pub fn new(a: [f32; 3], b: [f32; 3]) -> Option<Self> {
        if a.iter().chain(b.iter()).any(|v| !v.is_finite()) || (a[1] - b[1]).abs() > 0.001 {
            return None;
        }
        let delta = [b[0] - a[0], 0., b[2] - a[2]];
        let length = (delta[0] * delta[0] + delta[2] * delta[2]).sqrt();
        if length < 0.25 {
            return None;
        }
        Some(Self {
            a,
            length,
            tangent: delta.map(|v| v / length),
        })
    }
    pub fn point(&self, distance: f32) -> [f32; 3] {
        std::array::from_fn(|i| self.a[i] + self.tangent[i] * distance)
    }
    pub fn capture(&self, p: [f32; 3], v: [f32; 3], yaw: f32, radius: f32) -> Option<(f32, f32)> {
        let t = (p[0] - self.a[0]) * self.tangent[0] + (p[2] - self.a[2]) * self.tangent[2];
        if t < 0. || t > self.length || v[1] > 0.3 || (p[1] - radius - self.a[1]).abs() > 0.12 {
            return None;
        }
        let point = self.point(t);
        let across = ((p[0] - point[0]).powi(2) + (p[2] - point[2]).powi(2)).sqrt();
        let speed = (v[0] * v[0] + v[2] * v[2]).sqrt();
        let along = v[0] * self.tangent[0] + v[2] * self.tangent[2];
        let facing = yaw.sin() * self.tangent[0] + yaw.cos() * self.tangent[2];
        if across > 0.3 || speed < 1.8 || along.abs() / speed < 0.8 || facing.abs() < 0.8 {
            return None;
        }
        Some((t, along))
    }
}
#[derive(Clone, Copy)]
pub struct Grind {
    pub rail: usize,
    pub distance: f32,
    pub speed: f32,
    pub balance: f32,
    pub elapsed: f32,
}
