from enum import Enum
from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, computed_field

OperationParamMap = Dict[str, Any]


class OperationEnum(str, Enum):
    NEGATIVE = "negative"
    LOG = "log"
    GAMMA = "gamma"
    HIST_EQ_CLAHE = "hist_eq_clahe"
    HISTOGRAM = "histogram"
    GAUSSIAN = "gaussian"
    MEDIAN = "median"
    BILATERAL = "bilateral"
    SHARPEN = "sharpen"
    EDGES = "edges"
    EDGE = "edge"
    MORPH = "morph"
    MORPHOLOGY = "morphology"
    GEO = "geo"
    GEOMETRY = "geometry"
    THRESH_GLOBAL = "thresh_global"
    THRESHOLD_GLOBAL = "threshold-global"
    THRESH_ADAPT_OTSU = "thresh_adapt_otsu"
    THRESHOLD_ADAPTIVE = "threshold-adaptive"
    NLMEANS = "nlmeans"
    WHITE_BALANCE = "white_balance"
    HSV_ADJUST = "hsv_adjust"
    CONTRAST_STRETCH = "contrast_stretch"
    CARTOONIZE = "cartoonize"


JobStatus = Literal["idle", "queued", "processing", "completed", "error"]


class UploadResponse(BaseModel):
    image_id: str
    filename: str
    content_type: str
    size: int


class PreviewRequest(BaseModel):
    image_id: str
    operation: OperationEnum
    params: OperationParamMap = Field(default_factory=dict)


class PreviewResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    image_id: str = Field(alias="imageId")
    operation: str
    result_b64: str = Field(alias="resultB64")
    metrics: Optional[Dict[str, float]] = None


class ProcessRequest(BaseModel):
    image_id: str
    operation: OperationEnum
    params: OperationParamMap = Field(default_factory=dict)


class ProcessResponse(BaseModel):
    job_id: str
    status: JobStatus
    eta_ms: Optional[int] = None

class DownloadResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    job_id: str
    b64: str

    @computed_field(return_type=str, alias="jobId")
    def job_id_camel(self) -> str:
        return self.job_id


class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress: int = 0
    result_url: Optional[str] = None
    metrics: Optional[Dict[str, float]] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    uptime_seconds: float
    jobs_in_queue: int
